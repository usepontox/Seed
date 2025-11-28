
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { X } from "lucide-react";

export function PasswordChangeAlert() {
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        checkPasswordStatus();
    }, []);

    const checkPasswordStatus = async () => {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
            // Check if user has dismissed the alert
            const dismissed = user.user_metadata?.password_change_dismissed;

            // If not dismissed, show the alert
            // We could also check if the account is new (e.g. created recently) if we wanted
            if (!dismissed) {
                // setOpen(true); // Temporarily disabled to fix dark screen issue
            }
        }
    };

    const handleDismiss = async () => {
        setOpen(false);
        // Update user metadata to remember dismissal
        await supabase.auth.updateUser({
            data: { password_change_dismissed: true },
        });
    };

    const handleChangePassword = async () => {
        setOpen(false);
        // Update metadata so it doesn't show again immediately (or we can wait until they actually change it)
        // For now, let's dismiss it so it doesn't annoy them if they navigate away and back
        await supabase.auth.updateUser({
            data: { password_change_dismissed: true },
        });
        navigate("/configuracoes?tab=seguranca");
    };

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogContent className="relative">
                <button
                    onClick={handleDismiss}
                    className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
                >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                </button>
                <AlertDialogHeader>
                    <AlertDialogTitle>Alteração de Senha Recomendada</AlertDialogTitle>
                    <AlertDialogDescription>
                        Detectamos que você pode estar usando uma senha padrão. Para sua segurança, recomendamos que você altere sua senha para uma de sua preferência.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={handleDismiss}>Agora não</AlertDialogCancel>
                    <AlertDialogAction onClick={handleChangePassword}>Alterar Senha</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
