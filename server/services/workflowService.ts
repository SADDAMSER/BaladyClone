import { db } from '../db';
import { workflowDefinitions, workflowInstances, applications, applicationStatusHistory, notifications } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { SURVEYING_DECISION_WORKFLOW, PATH_CONFIGURATIONS, REQUIRED_ROLES } from '../workflows/surveyingDecisionWorkflow';

/**
 * خدمة إدارة سير العمل - المهمة 1.2
 * تدير تطبيق وتنفيذ workflow للقرار المساحي
 */
export class WorkflowService {

  /**
   * إنشاء تعريف workflow للقرار المساحي في قاعدة البيانات
   */
  async createSurveyingDecisionWorkflow(): Promise<any> {
    try {
      // التحقق من وجود workflow موجود مسبقاً
      const existingWorkflow = await db
        .select()
        .from(workflowDefinitions)
        .where(eq(workflowDefinitions.name, SURVEYING_DECISION_WORKFLOW.name))
        .limit(1);

      if (existingWorkflow.length > 0) {
        console.log('🔄 Workflow already exists, updating...');
        // تحديث الـ workflow الموجود
        const [updated] = await db
          .update(workflowDefinitions)
          .set({
            workflowData: SURVEYING_DECISION_WORKFLOW as any,
            stages: SURVEYING_DECISION_WORKFLOW.stages as any,
            transitions: SURVEYING_DECISION_WORKFLOW.transitions as any,
            businessRules: SURVEYING_DECISION_WORKFLOW.businessRules as any,
            version: SURVEYING_DECISION_WORKFLOW.version,
            updatedAt: new Date()
          })
          .where(eq(workflowDefinitions.id, existingWorkflow[0].id))
          .returning();
        
        return updated;
      }

      // إنشاء workflow جديد
      const [created] = await db
        .insert(workflowDefinitions)
        .values({
          id: randomUUID(),
          name: SURVEYING_DECISION_WORKFLOW.name,
          description: SURVEYING_DECISION_WORKFLOW.description,
          workflowData: SURVEYING_DECISION_WORKFLOW as any,
          stages: SURVEYING_DECISION_WORKFLOW.stages as any,
          transitions: SURVEYING_DECISION_WORKFLOW.transitions as any,
          businessRules: SURVEYING_DECISION_WORKFLOW.businessRules as any,
          isActive: true,
          version: SURVEYING_DECISION_WORKFLOW.version
        })
        .returning();

      console.log('✅ Surveying Decision Workflow created successfully');
      return created;

    } catch (error) {
      console.error('❌ Error creating workflow:', error);
      throw error;
    }
  }

  /**
   * بدء workflow instance جديد لطلب قرار مساحي
   */
  async startWorkflowInstance(applicationId: string): Promise<any> {
    try {
      // الحصول على تعريف الـ workflow
      const workflowDef = await this.getWorkflowDefinition();
      if (!workflowDef) {
        throw new Error('Workflow definition not found');
      }

      // التحقق من عدم وجود instance نشط للطلب
      const existingInstance = await db
        .select()
        .from(workflowInstances)
        .where(and(
          eq(workflowInstances.applicationId, applicationId),
          eq(workflowInstances.status, 'active')
        ))
        .limit(1);

      if (existingInstance.length > 0) {
        console.log(`⚠️ Active workflow instance already exists for application ${applicationId}`);
        return existingInstance[0];
      }

      // إنشاء workflow instance جديد
      const [instance] = await db
        .insert(workflowInstances)
        .values({
          id: randomUUID(),
          workflowDefinitionId: workflowDef.id,
          applicationId: applicationId,
          currentStage: 'path_determination', // المرحلة الأولى
          status: 'active',
          stageHistory: [
            {
              stage: 'path_determination',
              enteredAt: new Date().toISOString(),
              action: 'workflow_started'
            }
          ] as any,
          variables: {} as any
        })
        .returning();

      // تحديث حالة الطلب
      await db
        .update(applications)
        .set({
          status: 'under_review',
          currentStage: 'path_determination',
          updatedAt: new Date()
        })
        .where(eq(applications.id, applicationId));

      console.log(`✅ Workflow instance started for application ${applicationId}`);
      return instance;

    } catch (error) {
      console.error('❌ Error starting workflow instance:', error);
      throw error;
    }
  }

  /**
   * الانتقال إلى المرحلة التالية في الـ workflow
   */
  async transitionToNextStage(
    instanceId: string, 
    fromStage: string, 
    toStage: string, 
    userId: string,
    transitionData?: any
  ): Promise<any> {
    try {
      // الحصول على الـ instance الحالي
      const [instance] = await db
        .select()
        .from(workflowInstances)
        .where(eq(workflowInstances.id, instanceId));

      if (!instance) {
        throw new Error('Workflow instance not found');
      }

      // التحقق من صحة الانتقال
      const workflowDef = await this.getWorkflowDefinition();
      const validTransition = workflowDef?.transitions.find((t: any) => 
        t.from === fromStage && t.to === toStage
      );

      if (!validTransition) {
        throw new Error(`Invalid transition from ${fromStage} to ${toStage}`);
      }

      // تحديث history
      const currentHistory = instance.stageHistory || [];
      const newHistory = [
        ...currentHistory,
        {
          stage: toStage,
          enteredAt: new Date().toISOString(),
          fromStage: fromStage,
          userId: userId,
          action: 'stage_transition',
          data: transitionData
        }
      ];

      // تحديث الـ instance
      const [updated] = await db
        .update(workflowInstances)
        .set({
          currentStage: toStage,
          stageHistory: newHistory as any,
          variables: {
            ...instance.variables,
            ...transitionData
          } as any,
          updatedAt: new Date()
        })
        .where(eq(workflowInstances.id, instanceId))
        .returning();

      // تحديث الطلب
      await db
        .update(applications)
        .set({
          currentStage: toStage,
          updatedAt: new Date()
        })
        .where(eq(applications.id, instance.applicationId));

      // تسجيل في history
      await this.recordStatusChange(
        instance.applicationId,
        fromStage,
        toStage,
        userId,
        `Transitioned from ${fromStage} to ${toStage}`
      );

      // تنفيذ actions المرتبطة بالانتقال
      await this.executeTransitionActions(validTransition, instance, userId);

      console.log(`✅ Transitioned from ${fromStage} to ${toStage} for instance ${instanceId}`);
      return updated;

    } catch (error) {
      console.error('❌ Error transitioning workflow stage:', error);
      throw error;
    }
  }

  /**
   * تحديد مسار المعالجة (مكتبي/بوابة)
   */
  async determinePath(applicationId: string, submissionType: 'office' | 'digital'): Promise<string> {
    try {
      const pathConfig = submissionType === 'digital' 
        ? PATH_CONFIGURATIONS.digital_path 
        : PATH_CONFIGURATIONS.office_path;

      // تحديث متغيرات الـ workflow
      const instance = await this.getWorkflowInstanceByApplication(applicationId);
      if (instance) {
        await db
          .update(workflowInstances)
          .set({
            variables: {
              ...instance.variables,
              processing_path: submissionType,
              signature_type: pathConfig.signature_type,
              payment_type: pathConfig.payment_type
            } as any
          })
          .where(eq(workflowInstances.id, instance.id));
      }

      console.log(`📋 Path determined: ${pathConfig.name} for application ${applicationId}`);
      return pathConfig.name;

    } catch (error) {
      console.error('❌ Error determining path:', error);
      throw error;
    }
  }

  /**
   * إرسال إشعار للمستخدم المخصص للمرحلة الحالية
   */
  async sendStageNotification(instanceId: string, stageId: string): Promise<void> {
    try {
      const workflowDef = await this.getWorkflowDefinition();
      const stage = workflowDef?.stages.find((s: any) => s.id === stageId);
      
      if (!stage || !stage.notifications?.onEntry) {
        return;
      }

      // تحديد المستلمين
      const recipients = await this.resolveStageAssignees(stageId, instanceId);
      
      // إنشاء الإشعارات
      for (const recipient of recipients) {
        await db
          .insert(notifications)
          .values({
            id: randomUUID(),
            userId: recipient.userId,
            title: `مهمة جديدة: ${stage.name}`,
            message: stage.description || `تم تعيين مهمة جديدة في مرحلة ${stage.name}`,
            type: 'info',
            category: 'task_assignment',
            priority: 'medium',
            isRead: false
          });
      }

      console.log(`📬 Stage notifications sent for ${stageId}`);

    } catch (error) {
      console.error('❌ Error sending stage notification:', error);
    }
  }

  /**
   * الحصول على تعريف الـ workflow للقرار المساحي
   */
  private async getWorkflowDefinition(): Promise<any> {
    const [workflow] = await db
      .select()
      .from(workflowDefinitions)
      .where(eq(workflowDefinitions.name, SURVEYING_DECISION_WORKFLOW.name))
      .limit(1);
    
    return workflow;
  }

  /**
   * الحصول على workflow instance بواسطة الطلب
   */
  private async getWorkflowInstanceByApplication(applicationId: string): Promise<any> {
    const [instance] = await db
      .select()
      .from(workflowInstances)
      .where(and(
        eq(workflowInstances.applicationId, applicationId),
        eq(workflowInstances.status, 'active')
      ))
      .limit(1);
    
    return instance;
  }

  /**
   * تسجيل تغيير حالة في التاريخ
   */
  private async recordStatusChange(
    applicationId: string,
    previousStage: string | null,
    newStage: string,
    changedById: string,
    notes?: string
  ): Promise<void> {
    // Map workflow stages to application statuses
    const stageToStatus = {
      'path_determination': 'submitted',
      'public_service_review': 'under_review',
      'cashier_payment': 'payment_pending',
      'section_head_assignment': 'assigned',
      'field_survey': 'in_progress',
      'technical_review': 'technical_review',
      'assistant_head_approval': 'final_review',
      'final_approval': 'approved'
    };

    const previousStatus = previousStage ? stageToStatus[previousStage as keyof typeof stageToStatus] || 'submitted' : null;
    const newStatus = stageToStatus[newStage as keyof typeof stageToStatus] || 'under_review';

    await db
      .insert(applicationStatusHistory)
      .values({
        id: randomUUID(),
        applicationId,
        previousStatus,
        newStatus,
        previousStage,
        newStage,
        changedById,
        notes: notes || `Transitioned from ${previousStage || 'initial'} to ${newStage}`,
        changedAt: new Date()
      });
  }

  /**
   * تنفيذ actions المرتبطة بانتقال معين
   */
  private async executeTransitionActions(transition: any, instance: any, userId: string): Promise<void> {
    if (!transition.actions) return;

    for (const action of transition.actions) {
      switch (action.type) {
        case 'send_notification':
          await this.sendStageNotification(instance.id, instance.currentStage);
          break;
        case 'update_field':
          // تحديث حقول في الطلب
          break;
        case 'call_service':
          // استدعاء خدمة خارجية
          break;
        case 'generate_document':
          // توليد مستند
          break;
      }
    }
  }

  /**
   * تحديد المستخدمين المخصصين لمرحلة معينة
   */
  private async resolveStageAssignees(stageId: string, instanceId: string): Promise<Array<{userId: string}>> {
    // Logic لتحديد المستخدمين المناسبين بناءً على الدور والموقع الجغرافي
    // هذا سيتطلب integration مع نظام LBAC الموجود
    return []; // placeholder
  }

  /**
   * الحصول على جميع المراحل النشطة في النظام
   */
  async getActiveWorkflowInstances(): Promise<any[]> {
    return await db
      .select()
      .from(workflowInstances)
      .where(eq(workflowInstances.status, 'active'));
  }

  /**
   * إنهاء workflow instance
   */
  async completeWorkflow(instanceId: string, userId: string): Promise<void> {
    await db
      .update(workflowInstances)
      .set({
        status: 'completed',
        completedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(workflowInstances.id, instanceId));

    console.log(`✅ Workflow instance ${instanceId} completed`);
  }
}

// Singleton instance
export const workflowService = new WorkflowService();