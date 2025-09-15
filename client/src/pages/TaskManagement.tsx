import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { ListTodo, Search, Plus, Clock, AlertCircle, CheckCircle, User, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Schema for adding new task
const addTaskSchema = z.object({
  title: z.string().min(1, "عنوان المهمة مطلوب"),
  description: z.string().min(1, "وصف المهمة مطلوب"),
  assignedToId: z.string().min(1, "يجب اختيار المُكلف"),
  priority: z.enum(["low", "medium", "high"], {
    required_error: "يجب تحديد أولوية المهمة"
  }),
  dueDate: z.string().min(1, "تاريخ الاستحقاق مطلوب"),
});

type AddTaskForm = z.infer<typeof addTaskSchema>;

export default function TaskManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["/api/tasks"],
  });

  const { data: users } = useQuery({
    queryKey: ["/api/users"],
  });

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800",
    in_progress: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800", 
    cancelled: "bg-red-100 text-red-800"
  };

  const statusLabels = {
    pending: "في الانتظار",
    in_progress: "قيد التنفيذ",
    completed: "مكتمل",
    cancelled: "ملغي"
  };

  const priorityColors = {
    high: "bg-red-100 text-red-800",
    medium: "bg-yellow-100 text-yellow-800",
    low: "bg-green-100 text-green-800"
  };

  const priorityLabels = {
    high: "عالية",
    medium: "متوسطة",
    low: "منخفضة"
  };

  const mockTasks = [
    {
      id: "1",
      title: "مراجعة طلب ترخيص بناء #BL-2024-001",
      description: "مراجعة المخططات والوثائق المطلوبة",
      assignedTo: "م. أحمد الوشلي",
      assignedBy: "م. عبدالله الحداد",
      applicationNumber: "BL-2024-001",
      priority: "high",
      status: "in_progress",
      dueDate: "2024-01-30",
      progress: 65,
      createdAt: "2024-01-25"
    },
    {
      id: "2",
      title: "تنفيذ مسح ميداني للقطعة #SD-2024-002",
      description: "تحديد الحدود والمساحة الفعلية للقطعة",
      assignedTo: "م. فيصل الشهاري",
      assignedBy: "م. فاطمة الشامي",
      applicationNumber: "SD-2024-002",
      priority: "medium",
      status: "pending",
      dueDate: "2024-02-02",
      progress: 0,
      createdAt: "2024-01-24"
    },
    {
      id: "3",
      title: "إعداد تقرير فني للمشروع التجاري",
      description: "تقييم الاشتراطات الفنية ومطابقة المشروع",
      assignedTo: "م. نادية السالمي", 
      assignedBy: "م. أحمد الحداد",
      applicationNumber: "BL-2024-003",
      priority: "medium",
      status: "completed",
      dueDate: "2024-01-28",
      progress: 100,
      createdAt: "2024-01-20"
    }
  ];

  const displayTasks = Array.isArray(tasks) ? tasks : mockTasks;
  const availableUsers = Array.isArray(users) ? users : [];

  // Form for adding new task
  const addTaskForm = useForm<AddTaskForm>({
    resolver: zodResolver(addTaskSchema),
    defaultValues: {
      title: "",
      description: "",
      assignedToId: "",
      priority: undefined,
      dueDate: "",
    },
  });

  // Mutation for adding new task
  const addTaskMutation = useMutation({
    mutationFn: (data: AddTaskForm) =>
      apiRequest("POST", "/api/tasks", data),
    onSuccess: () => {
      toast({
        title: "تم بنجاح",
        description: "تم إضافة المهمة بنجاح",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setShowAddDialog(false);
      addTaskForm.reset();
    },
    onError: (error) => {
      toast({
        title: "خطأ",
        description: `فشل في إضافة المهمة: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const getTaskStats = () => {
    return {
      total: displayTasks.length,
      pending: displayTasks.filter((t: any) => t.status === "pending").length,
      inProgress: displayTasks.filter((t: any) => t.status === "in_progress").length,
      completed: displayTasks.filter((t: any) => t.status === "completed").length,
      overdue: displayTasks.filter((t: any) => new Date(t.dueDate) < new Date() && t.status !== "completed").length
    };
  };

  const stats = getTaskStats();

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Header />
      
      <div className="container mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4 space-x-reverse">
            <div className="w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center">
              <ListTodo className="text-accent" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground font-cairo">إدارة المهام</h1>
              <p className="text-muted-foreground">متابعة وإدارة سير العمل والمهام</p>
            </div>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button 
                className="flex items-center space-x-2 space-x-reverse"
                data-testid="button-new-task"
              >
                <Plus size={16} />
                <span>مهمة جديدة</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-right font-cairo">إضافة مهمة جديدة</DialogTitle>
              </DialogHeader>

              <Form {...addTaskForm}>
                <form
                  onSubmit={addTaskForm.handleSubmit((data) =>
                    addTaskMutation.mutate(data)
                  )}
                  className="space-y-4"
                >
                  <FormField
                    control={addTaskForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>عنوان المهمة*</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="ادخل عنوان المهمة"
                            {...field}
                            data-testid="input-task-title"
                            disabled={addTaskMutation.isPending}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={addTaskForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>وصف المهمة*</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="وصف تفصيلي لما يجب إنجازه"
                            {...field}
                            data-testid="input-task-description"
                            disabled={addTaskMutation.isPending}
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={addTaskForm.control}
                      name="assignedToId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>المُكلف*</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-task-assignee">
                                <SelectValue placeholder="اختر الموظف المُكلف" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {availableUsers.map((user: any) => (
                                <SelectItem key={user.id} value={user.id}>
                                  {user.fullName || user.username}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={addTaskForm.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>الأولوية*</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-task-priority">
                                <SelectValue placeholder="حدد أولوية المهمة" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="high">عالية</SelectItem>
                              <SelectItem value="medium">متوسطة</SelectItem>
                              <SelectItem value="low">منخفضة</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={addTaskForm.control}
                      name="dueDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>تاريخ الاستحقاق*</FormLabel>
                          <FormControl>
                            <Input 
                              type="date"
                              {...field}
                              data-testid="input-task-due-date"
                              disabled={addTaskMutation.isPending}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAddDialog(false)}
                      disabled={addTaskMutation.isPending}
                      data-testid="button-cancel-task"
                    >
                      إلغاء
                    </Button>
                    <Button
                      type="submit"
                      disabled={addTaskMutation.isPending}
                      data-testid="button-save-task"
                    >
                      {addTaskMutation.isPending && (
                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      )}
                      إنشاء المهمة
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" data-testid="tab-overview">نظرة عامة</TabsTrigger>
            <TabsTrigger value="my-tasks" data-testid="tab-my-tasks">مهامي</TabsTrigger>
            <TabsTrigger value="team-tasks" data-testid="tab-team-tasks">مهام الفريق</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-primary">{stats.total}</p>
                      <p className="text-muted-foreground text-sm">إجمالي المهام</p>
                    </div>
                    <ListTodo className="h-8 w-8 text-primary/60" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                      <p className="text-muted-foreground text-sm">في الانتظار</p>
                    </div>
                    <Clock className="h-8 w-8 text-yellow-600/60" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
                      <p className="text-muted-foreground text-sm">قيد التنفيذ</p>
                    </div>
                    <User className="h-8 w-8 text-blue-600/60" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
                      <p className="text-muted-foreground text-sm">مكتملة</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-600/60" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
                      <p className="text-muted-foreground text-sm">متأخرة</p>
                    </div>
                    <AlertCircle className="h-8 w-8 text-red-600/60" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters and Search */}
            <Card>
              <CardHeader>
                <CardTitle className="font-cairo">البحث والتصفية</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <Input
                      placeholder="ابحث في المهام..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full"
                      data-testid="input-search-tasks"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-48" data-testid="select-status-filter">
                      <SelectValue placeholder="حالة المهمة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الحالات</SelectItem>
                      <SelectItem value="pending">في الانتظار</SelectItem>
                      <SelectItem value="in_progress">قيد التنفيذ</SelectItem>
                      <SelectItem value="completed">مكتملة</SelectItem>
                      <SelectItem value="cancelled">ملغية</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="w-full md:w-48" data-testid="select-priority-filter">
                      <SelectValue placeholder="أولوية المهمة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الأولويات</SelectItem>
                      <SelectItem value="high">عالية</SelectItem>
                      <SelectItem value="medium">متوسطة</SelectItem>
                      <SelectItem value="low">منخفضة</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" data-testid="button-search-filter">
                    <Search size={16} />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Tasks Table */}
            <Card>
              <CardHeader>
                <CardTitle className="font-cairo">قائمة المهام</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table data-testid="table-tasks">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">عنوان المهمة</TableHead>
                        <TableHead className="text-right">المُكلف</TableHead>
                        <TableHead className="text-right">المُكلِف</TableHead>
                        <TableHead className="text-right">رقم المعاملة</TableHead>
                        <TableHead className="text-right">الأولوية</TableHead>
                        <TableHead className="text-right">التقدم</TableHead>
                        <TableHead className="text-right">تاريخ الاستحقاق</TableHead>
                        <TableHead className="text-right">الحالة</TableHead>
                        <TableHead className="text-right">الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayTasks.map((task: any) => (
                        <TableRow key={task.id} data-testid={`row-task-${task.id}`}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{task.title}</p>
                              <p className="text-sm text-muted-foreground">{task.description}</p>
                            </div>
                          </TableCell>
                          <TableCell>{task.assignedTo}</TableCell>
                          <TableCell>{task.assignedBy}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{task.applicationNumber}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              className={priorityColors[task.priority as keyof typeof priorityColors]}
                              data-testid={`badge-priority-${task.priority}`}
                            >
                              {priorityLabels[task.priority as keyof typeof priorityLabels]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-2">
                              <Progress value={task.progress} className="w-full" />
                              <p className="text-xs text-muted-foreground text-center">{task.progress}%</p>
                            </div>
                          </TableCell>
                          <TableCell>{task.dueDate}</TableCell>
                          <TableCell>
                            <Badge 
                              className={statusColors[task.status as keyof typeof statusColors]}
                              data-testid={`badge-task-status-${task.status}`}
                            >
                              {statusLabels[task.status as keyof typeof statusLabels]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2 space-x-reverse">
                              <Button 
                                variant="outline" 
                                size="sm"
                                data-testid={`button-view-task-${task.id}`}
                              >
                                عرض
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                data-testid={`button-update-task-${task.id}`}
                              >
                                تحديث
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="my-tasks" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-cairo">مهامي الشخصية</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4" data-testid="personal-tasks">
                  {displayTasks.slice(0, 3).map((task: any) => (
                    <Card key={`personal-${task.id}`} className="border-l-4 border-l-primary">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-foreground">{task.title}</h4>
                            <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                            <div className="flex items-center space-x-4 space-x-reverse">
                              <Badge 
                                className={priorityColors[task.priority as keyof typeof priorityColors]}
                              >
                                {priorityLabels[task.priority as keyof typeof priorityLabels]}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                الاستحقاق: {task.dueDate}
                              </span>
                            </div>
                            <div className="mt-3">
                              <Progress value={task.progress} className="w-full" />
                              <p className="text-xs text-muted-foreground mt-1">{task.progress}% مكتمل</p>
                            </div>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            data-testid={`button-work-on-${task.id}`}
                          >
                            العمل عليها
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team-tasks" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-cairo">مهام الفريق</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="team-tasks">
                  {displayTasks.map((task: any) => (
                    <Card key={`team-${task.id}`} className="border">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h5 className="font-medium text-foreground text-sm">{task.title}</h5>
                            <Badge 
                              className={statusColors[task.status as keyof typeof statusColors]}
                              data-testid={`team-task-status-${task.id}`}
                            >
                              {statusLabels[task.status as keyof typeof statusLabels]}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{task.description}</p>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">المُكلف:</span>
                            <span className="text-foreground">{task.assignedTo}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">الاستحقاق:</span>
                            <span className="text-foreground">{task.dueDate}</span>
                          </div>
                          <Progress value={task.progress} className="w-full" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
