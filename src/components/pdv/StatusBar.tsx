import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, CreditCard, CheckCircle2, Globe, FileText, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatusType =
    | 'idle'
    | 'scanning'
    | 'cpf_request'
    | 'payment_waiting'
    | 'payment_approved'
    | 'sefaz_connecting'
    | 'printing'
    | 'completed'
    | 'error';

interface StatusBarProps {
    status: StatusType;
    message?: string;
    detail?: string;
}

const statusConfig = {
    idle: {
        icon: Search,
        color: 'text-muted-foreground',
        bgColor: 'bg-muted/30',
        borderColor: 'border-muted',
        message: 'Aguardando produto',
        animate: false,
    },
    scanning: {
        icon: Loader2,
        color: 'text-primary',
        bgColor: 'bg-primary/10',
        borderColor: 'border-primary/30',
        message: 'Processando...',
        animate: true,
    },
    cpf_request: {
        icon: CreditCard,
        color: 'text-warning',
        bgColor: 'bg-warning/10',
        borderColor: 'border-warning/30',
        message: 'Digite o CPF do cliente',
        animate: true,
    },
    payment_waiting: {
        icon: CreditCard,
        color: 'text-primary',
        bgColor: 'bg-primary/10',
        borderColor: 'border-primary/30',
        message: 'Aguardando pagamento...',
        animate: true,
    },
    payment_approved: {
        icon: CheckCircle2,
        color: 'text-success',
        bgColor: 'bg-success/10',
        borderColor: 'border-success/30',
        message: '✓ Pagamento aprovado!',
        animate: false,
    },
    sefaz_connecting: {
        icon: Globe,
        color: 'text-primary',
        bgColor: 'bg-primary/10',
        borderColor: 'border-primary/30',
        message: 'Conectando SEFAZ...',
        animate: true,
    },
    printing: {
        icon: FileText,
        color: 'text-primary',
        bgColor: 'bg-primary/10',
        borderColor: 'border-primary/30',
        message: 'Emitindo comprovante...',
        animate: true,
    },
    completed: {
        icon: CheckCircle2,
        color: 'text-success',
        bgColor: 'bg-success/10',
        borderColor: 'border-success/30',
        message: '✓ Venda concluída!',
        animate: false,
    },
    error: {
        icon: AlertCircle,
        color: 'text-destructive',
        bgColor: 'bg-destructive/10',
        borderColor: 'border-destructive/30',
        message: 'Erro no processamento',
        animate: false,
    },
};

export function StatusBar({ status, message, detail }: StatusBarProps) {
    const config = statusConfig[status];
    const Icon = config.icon;

    return (
        <Alert className={cn(
            "border-2 transition-all duration-300",
            config.bgColor,
            config.borderColor
        )}>
            <div className="flex items-center gap-3">
                <Icon
                    className={cn(
                        "h-5 w-5",
                        config.color,
                        config.animate && "animate-spin"
                    )}
                />
                <AlertDescription className="flex-1 flex items-center justify-between">
                    <span className={cn("font-semibold text-base", config.color)}>
                        {message || config.message}
                    </span>
                    {detail && (
                        <Badge variant="secondary" className="ml-2">
                            {detail}
                        </Badge>
                    )}
                </AlertDescription>
            </div>
        </Alert>
    );
}
