import BackButton from './BackButton';
import { Separator } from '@/components/ui/separator';

interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  backTo?: string;
  backLabel?: string;
  breadcrumbs?: BreadcrumbItem[];
  children?: React.ReactNode;
  className?: string;
}

export default function PageHeader({
  title,
  description,
  backTo,
  backLabel,
  breadcrumbs,
  children,
  className = ""
}: PageHeaderProps) {
  return (
    <div className={`bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4" dir="rtl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 space-x-reverse min-w-0 flex-1">
            {(backTo || backLabel) && (
              <>
                <BackButton
                  to={backTo}
                  label={backLabel}
                />
                <Separator orientation="vertical" className="h-6" />
              </>
            )}
            
            <div className="min-w-0 flex-1">
              {breadcrumbs && breadcrumbs.length > 0 && (
                <nav className="flex mb-2" aria-label="Breadcrumb">
                  <ol className="flex items-center space-x-2 space-x-reverse text-sm">
                    {breadcrumbs.map((item, index) => (
                      <li key={index} className="flex items-center">
                        {index > 0 && (
                          <span className="mx-2 text-gray-300 dark:text-gray-600">›</span>
                        )}
                        {item.href && !item.current ? (
                          <a 
                            href={item.href}
                            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 font-medium transition-colors"
                          >
                            {item.label}
                          </a>
                        ) : (
                          <span 
                            className={`font-medium ${
                              item.current 
                                ? "text-gray-900 dark:text-white" 
                                : "text-gray-500 dark:text-gray-400"
                            }`}
                            aria-current={item.current ? "page" : undefined}
                          >
                            {item.label}
                          </span>
                        )}
                      </li>
                    ))}
                  </ol>
                </nav>
              )}
              
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                {title}
              </h1>
              
              {description && (
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {description}
                </p>
              )}
            </div>
          </div>
          
          {children && (
            <div className="flex-shrink-0">
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}