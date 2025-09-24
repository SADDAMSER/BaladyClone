import { WorkflowStageConfig, WorkflowTransitionConfig, BusinessRuleConfig } from '@shared/schema';

/**
 * تعريف سير العمل للقرار المساحي - المهمة 1.2
 * يشمل 8 مراحل أساسية مع تمييز المسارين (مكتبي/بوابة)
 */
export const SURVEYING_DECISION_WORKFLOW = {
  name: "surveying_decision_workflow",
  nameAr: "سير عمل القرار المساحي", 
  nameEn: "Surveying Decision Workflow",
  description: "سير العمل الكامل لمعالجة طلبات القرار المساحي من التقديم إلى الإصدار النهائي",
  version: "1.0",
  serviceType: "surveying_decision",
  
  // ==========================================
  // 8 مراحل أساسية + مسارين (مكتبي/بوابة)
  // ==========================================
  stages: [
    // المرحلة 0: تمييز المسار بعد تأكيد الطلب
    {
      id: "path_determination",
      name: "تحديد المسار",
      nameEn: "Path Determination", 
      description: "تحديد المسار: مكتبي (توقيع يدوي + سداد نقدي) أو بوابة (توقيع رقمي + دفع إلكتروني)",
      type: "decision" as const,
      assignee: {
        type: "system" as const,
        value: "auto_assignment",
        rule: "path_selection_based_on_submission_type"
      },
      timeLimits: {
        expected: 2,
        maximum: 5,
        unit: "hours" as const
      },
      notifications: {
        onEntry: true,
        onOverdue: false,
        recipients: ["applicant"]
      }
    },

    // المرحلة 1: موظف خدمة الجمهور
    {
      id: "public_service_review",
      name: "مراجعة موظف خدمة الجمهور",
      nameEn: "Public Service Review",
      description: "مراجعة اكتمال المستندات واحتساب الرسوم الكشفية",
      type: "user_task" as const,
      assignee: {
        type: "role" as const,
        value: "public_service_clerk",
        rule: "geographic_assignment"
      },
      formFields: ["document_verification", "fee_calculation", "preliminary_notes"],
      timeLimits: {
        expected: 24,
        maximum: 72, 
        unit: "hours" as const
      },
      notifications: {
        onEntry: true,
        onOverdue: true,
        recipients: ["assigned_user", "department_manager"]
      }
    },

    // المرحلة 2: إشعار موظف الصندوق عند الطباعة
    {
      id: "cashier_notification", 
      name: "إشعار موظف الصندوق",
      nameEn: "Cashier Notification",
      description: "إشعار موظف الصندوق عند طباعة طلب الخدمة ووصل السداد",
      type: "service_task" as const,
      assignee: {
        type: "role" as const,
        value: "cashier",
        rule: "department_assignment"  
      },
      timeLimits: {
        expected: 2,
        maximum: 6,
        unit: "hours" as const
      },
      notifications: {
        onEntry: true,
        onOverdue: true,
        recipients: ["cashier", "public_service_clerk"]
      }
    },

    // المرحلة 3: رئيس قسم المساحة (تكليف المساح)
    {
      id: "section_head_assignment",
      name: "تكليف رئيس قسم المساحة",
      nameEn: "Section Head Assignment", 
      description: "تعيين المساح حسب المنطقة الجغرافية ومعالجة الاسقاط القديم إن وجد",
      type: "user_task" as const,
      assignee: {
        type: "role" as const,
        value: "surveying_section_head",
        rule: "geographic_department_head"
      },
      formFields: ["surveyor_assignment", "old_projection_handling", "assignment_notes"],
      timeLimits: {
        expected: 48,
        maximum: 120,
        unit: "hours" as const
      },
      notifications: {
        onEntry: true,
        onOverdue: true,
        recipients: ["assigned_user", "surveying_department_manager"]
      }
    },

    // المرحلة 4: مساعد رئيس القسم (تحديد الموعد)
    {
      id: "assistant_head_scheduling",
      name: "مساعد رئيس القسم - تحديد الموعد", 
      nameEn: "Assistant Head Scheduling",
      description: "إرسال إشعار للمواطن وتحديد موعد الرفع المساحي",
      type: "user_task" as const,
      assignee: {
        type: "role" as const,
        value: "assistant_section_head", 
        rule: "department_assignment"
      },
      formFields: ["citizen_notification", "appointment_scheduling", "contact_details"],
      timeLimits: {
        expected: 24,
        maximum: 48,
        unit: "hours" as const
      },
      notifications: {
        onEntry: true,
        onOverdue: true, 
        recipients: ["assigned_user", "citizen", "surveyor"]
      }
    },

    // المرحلة 5: المساح (الرفع الميداني)
    {
      id: "surveyor_field_work",
      name: "المساح - الرفع الميداني",
      nameEn: "Surveyor Field Work",
      description: "تنفيذ الرفع المساحي باستخدام GNSS/RTK ومزامنة البيانات",
      type: "user_task" as const,
      assignee: {
        type: "specific_user" as const,
        value: "assigned_surveyor", 
        rule: "task_assignment"
      },
      formFields: ["gnss_data", "field_measurements", "photos", "coordinates"],
      timeLimits: {
        expected: 72,
        maximum: 168,
        unit: "hours" as const
      },
      notifications: {
        onEntry: true,
        onOverdue: true,
        recipients: ["assigned_surveyor", "technical_reviewer", "section_head"]
      }
    },

    // المرحلة 6: المراجع الفني (معالجة البيانات)
    {
      id: "technical_review",
      name: "المراجع الفني - معالجة البيانات",
      nameEn: "Technical Review",
      description: "مراجعة البيانات على خريطة تفاعلية ورسم الشوارع ومقارنة مع مخطط وحدة الجوار",
      type: "user_task" as const,
      assignee: {
        type: "role" as const,
        value: "technical_reviewer",
        rule: "department_specialization"
      },
      formFields: ["map_review", "street_drawing", "neighborhood_comparison", "report_draft"],
      timeLimits: {
        expected: 48,
        maximum: 96,
        unit: "hours" as const
      },
      notifications: {
        onEntry: true,
        onOverdue: true,
        recipients: ["assigned_user", "section_head", "surveyor"]
      }
    },

    // المرحلة 7: اعتماد رئيس القسم
    {
      id: "section_head_approval",
      name: "اعتماد رئيس القسم",
      nameEn: "Section Head Approval",
      description: "مراجعة واعتماد التقرير من رئيس قسم المساحة",
      type: "user_task" as const,
      assignee: {
        type: "role" as const,
        value: "surveying_section_head",
        rule: "same_as_assignment_stage"
      },
      formFields: ["approval_decision", "approval_notes", "quality_check"],
      timeLimits: {
        expected: 24,
        maximum: 48,
        unit: "hours" as const
      },
      notifications: {
        onEntry: true,
        onOverdue: true,
        recipients: ["assigned_user", "branch_manager", "technical_reviewer"]
      }
    },

    // المرحلة 8: اعتماد مدير الفرع أو تصعيد
    {
      id: "branch_manager_final_approval",
      name: "الاعتماد النهائي أو التصعيد", 
      nameEn: "Final Approval or Escalation",
      description: "اعتماد نهائي من مدير الفرع أو تصعيد لمكتب المحافظة في حالة إشكال الشوارع",
      type: "decision" as const,
      assignee: {
        type: "role" as const,
        value: "branch_manager",
        rule: "escalation_logic" 
      },
      formFields: ["final_decision", "escalation_reason", "governor_office_referral"],
      timeLimits: {
        expected: 48,
        maximum: 120,
        unit: "hours" as const
      },
      notifications: {
        onEntry: true,
        onOverdue: true,
        recipients: ["assigned_user", "governor_office", "citizen", "section_head"]
      }
    }
  ] as WorkflowStageConfig[],

  // ==========================================
  // انتقالات سير العمل
  // ==========================================
  transitions: [
    // بداية → تحديد المسار
    {
      id: "start_to_path_determination",
      from: "start",
      to: "path_determination", 
      condition: {
        field: "application_status",
        operator: "equals",
        value: "submitted"
      },
      actions: [
        {
          type: "send_notification",
          config: {
            template: "path_determination_started",
            recipients: ["applicant"]
          }
        }
      ]
    },

    // تحديد المسار → موظف خدمة الجمهور
    {
      id: "path_to_public_service", 
      from: "path_determination",
      to: "public_service_review",
      condition: {
        operator: "always"
      },
      actions: [
        {
          type: "send_notification", 
          config: {
            template: "assigned_to_public_service",
            recipients: ["public_service_clerk"]
          }
        }
      ]
    },

    // موظف خدمة الجمهور → إشعار الصندوق
    {
      id: "public_service_to_cashier",
      from: "public_service_review", 
      to: "cashier_notification",
      condition: {
        field: "review_status",
        operator: "equals", 
        value: "approved_for_payment"
      },
      actions: [
        {
          type: "send_notification",
          config: {
            template: "print_service_request",
            recipients: ["cashier"]
          }
        },
        {
          type: "update_field",
          config: {
            field: "fees_calculated",
            value: true
          }
        }
      ]
    },

    // إشعار الصندوق → رئيس قسم المساحة
    {
      id: "cashier_to_section_head",
      from: "cashier_notification",
      to: "section_head_assignment",
      condition: {
        field: "payment_status", 
        operator: "equals",
        value: "paid"
      },
      actions: [
        {
          type: "send_notification",
          config: {
            template: "payment_confirmed_assign_surveyor", 
            recipients: ["surveying_section_head"]
          }
        }
      ]
    },

    // رئيس قسم المساحة → مساعد رئيس القسم  
    {
      id: "section_head_to_assistant",
      from: "section_head_assignment",
      to: "assistant_head_scheduling", 
      condition: {
        field: "surveyor_assigned",
        operator: "equals",
        value: true
      },
      actions: [
        {
          type: "send_notification",
          config: {
            template: "surveyor_assigned_schedule_appointment",
            recipients: ["assistant_section_head"]
          }
        }
      ]
    },

    // مساعد رئيس القسم → المساح
    {
      id: "assistant_to_surveyor",
      from: "assistant_head_scheduling", 
      to: "surveyor_field_work",
      condition: {
        field: "appointment_scheduled",
        operator: "equals",
        value: true
      },
      actions: [
        {
          type: "send_notification",
          config: {
            template: "appointment_scheduled_start_survey",
            recipients: ["assigned_surveyor", "citizen"]
          }
        }
      ]
    },

    // المساح → المراجع الفني
    {
      id: "surveyor_to_technical_review", 
      from: "surveyor_field_work",
      to: "technical_review",
      condition: {
        field: "survey_completed",
        operator: "equals", 
        value: true
      },
      actions: [
        {
          type: "send_notification",
          config: {
            template: "survey_completed_review_data",
            recipients: ["technical_reviewer"]
          }
        },
        {
          type: "call_service",
          config: {
            service: "data_sync_service",
            action: "sync_field_data"
          }
        }
      ]
    },

    // المراجع الفني → رئيس القسم للاعتماد
    {
      id: "technical_review_to_section_approval",
      from: "technical_review",
      to: "section_head_approval",
      condition: {
        field: "technical_review_completed", 
        operator: "equals",
        value: true
      },
      actions: [
        {
          type: "send_notification",
          config: {
            template: "technical_review_completed_approve",
            recipients: ["surveying_section_head"]
          }
        },
        {
          type: "generate_document",
          config: {
            template: "survey_report_draft",
            format: "pdf"
          }
        }
      ]
    },

    // رئيس القسم → مدير الفرع
    {
      id: "section_approval_to_final_approval",
      from: "section_head_approval",
      to: "branch_manager_final_approval", 
      condition: {
        field: "section_head_approved",
        operator: "equals",
        value: true
      },
      actions: [
        {
          type: "send_notification", 
          config: {
            template: "section_approved_final_review",
            recipients: ["branch_manager"]
          }
        }
      ]
    },

    // مدير الفرع → إنهاء أو تصعيد
    {
      id: "final_approval_to_completion",
      from: "branch_manager_final_approval",
      to: "end",
      condition: {
        field: "final_decision",
        operator: "equals", 
        value: "approved"
      },
      actions: [
        {
          type: "send_notification",
          config: {
            template: "decision_approved_notify_citizen", 
            recipients: ["citizen", "all_stakeholders"]
          }
        },
        {
          type: "generate_document",
          config: {
            template: "final_surveying_decision",
            format: "pdf"
          }
        },
        {
          type: "update_field",
          config: {
            field: "application_status",
            value: "completed"
          }
        }
      ]
    },

    // تصعيد لمكتب المحافظة
    {
      id: "escalation_to_governor_office",
      from: "branch_manager_final_approval", 
      to: "governor_office_review",
      condition: {
        field: "has_street_issues",
        operator: "equals",
        value: true
      },
      actions: [
        {
          type: "send_notification",
          config: {
            template: "escalated_to_governor_office",
            recipients: ["governor_office", "branch_manager", "citizen"]
          }
        }
      ]
    }
  ] as WorkflowTransitionConfig[],

  // ==========================================
  // قواعد العمل
  // ==========================================
  businessRules: [
    // قاعدة تحديد المسار
    {
      id: "path_determination_rule",
      name: "تحديد مسار المعالجة",
      description: "تحديد المسار بناءً على طريقة التقديم والتوقيع",
      trigger: "on_stage_enter", 
      condition: "stage === 'path_determination'",
      actions: [
        {
          type: "set_field_value",
          target: "processing_path", 
          value: "submission_type === 'digital' ? 'digital_path' : 'office_path'"
        }
      ]
    },

    // قاعدة احتساب الرسوم
    {
      id: "fee_calculation_rule",
      name: "احتساب الرسوم الكشفية",
      description: "احتساب الرسوم تلقائياً بناءً على نوع القرار والمساحة", 
      trigger: "on_stage_enter",
      condition: "stage === 'public_service_review'",
      actions: [
        {
          type: "calculate_fee",
          target: "inspection_fees",
          value: "base_fee + (area * area_rate) + service_charge"
        }
      ]
    },

    // قاعدة تعيين المساح
    {
      id: "surveyor_assignment_rule", 
      name: "تعيين المساح حسب المنطقة",
      description: "تعيين تلقائي للمساح بناءً على الموقع الجغرافي والتخصص",
      trigger: "on_field_change",
      condition: "field === 'geographic_location'", 
      actions: [
        {
          type: "route_to_stage",
          target: "surveyor_field_work",
          value: "auto_assign_surveyor_by_location()"
        }
      ]
    },

    // قاعدة التصعيد
    {
      id: "escalation_rule",
      name: "قاعدة التصعيد لمكتب المحافظة", 
      description: "تصعيد تلقائي في حالة وجود إشكالات في الشوارع",
      trigger: "on_field_change",
      condition: "field === 'street_issues' && value === true",
      actions: [
        {
          type: "route_to_stage", 
          target: "governor_office_review",
          value: "street_issues_escalation"
        }
      ]
    }
  ] as BusinessRuleConfig[]
};

/**
 * إعدادات المسارين (مكتبي/بوابة)
 */
export const PATH_CONFIGURATIONS = {
  office_path: {
    name: "المسار المكتبي",
    signature_type: "manual",
    payment_type: "cash", 
    additional_steps: ["physical_document_verification", "manual_signature_collection"]
  },
  
  digital_path: {
    name: "مسار البوابة الرقمية",
    signature_type: "digital", 
    payment_type: "electronic",
    additional_steps: ["digital_signature_verification", "online_payment_processing"]
  }
};

/**
 * تكوينات الأدوار المطلوبة للـ workflow
 */
export const REQUIRED_ROLES = [
  {
    code: "public_service_clerk",
    nameAr: "موظف خدمة الجمهور",
    nameEn: "Public Service Clerk",
    permissions: ["review_applications", "calculate_fees", "verify_documents"]
  },
  {
    code: "cashier", 
    nameAr: "أمين الصندوق",
    nameEn: "Cashier",
    permissions: ["manage_treasury", "record_payments", "print_receipts"]
  },
  {
    code: "surveying_section_head",
    nameAr: "رئيس قسم المساحة", 
    nameEn: "Surveying Section Head",
    permissions: ["assign_tasks", "approve_applications", "manage_surveyors"]
  },
  {
    code: "assistant_section_head",
    nameAr: "مساعد رئيس القسم",
    nameEn: "Assistant Section Head", 
    permissions: ["schedule_appointments", "send_notifications", "coordinate_activities"]
  },
  {
    code: "surveyor",
    nameAr: "مساح",
    nameEn: "Surveyor",
    permissions: ["conduct_survey", "submit_reports", "use_field_equipment"]
  },
  {
    code: "technical_reviewer",
    nameAr: "مراجع فني", 
    nameEn: "Technical Reviewer",
    permissions: ["review_technical_data", "validate_measurements", "generate_reports"]
  },
  {
    code: "branch_manager",
    nameAr: "مدير الفرع",
    nameEn: "Branch Manager",
    permissions: ["final_approval", "escalate_issues", "manage_department"]
  }
];