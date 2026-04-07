import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { FileUp, FileCheck, Loader2, Download } from "lucide-react";
import { toast } from "sonner";

interface UploadCRLVButtonProps {
  vehicleId: string;
  vehiclePlate: string;
  hasCrlv: boolean;
  crlvUrl?: string;
  onUploaded: (url: string) => void;
}

export function UploadCRLVButton({ vehicleId, vehiclePlate, hasCrlv, crlvUrl, onUploaded }: UploadCRLVButtonProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 10MB.");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${vehicleId}/crlv.${ext}`;

      await supabase.storage.from("vehicle-documents").remove([path]);

      const { error: uploadError } = await supabase.storage
        .from("vehicle-documents")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from("vehicles")
        .update({ crlv_url: path } as any)
        .eq("id", vehicleId);

      if (updateError) throw updateError;

      onUploaded(path);
      toast.success(`CRLV de ${vehiclePlate} enviado com sucesso!`);
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao enviar CRLV: " + err.message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDownload = async () => {
    if (!crlvUrl) return;
    const { data, error } = await supabase.storage
      .from("vehicle-documents")
      .createSignedUrl(crlvUrl, 300);
    if (error || !data?.signedUrl) {
      toast.error("Erro ao gerar link de download");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="flex items-center gap-0">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={handleUpload}
      />
      <Button
        variant="ghost"
        size="icon"
        className={`h-8 w-8 ${hasCrlv ? "text-success hover:text-success/80" : "text-muted-foreground hover:text-primary"}`}
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        title={hasCrlv ? "CRLV enviado — clique para substituir" : "Enviar CRLV"}
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : hasCrlv ? (
          <FileCheck className="h-4 w-4" />
        ) : (
          <FileUp className="h-4 w-4" />
        )}
      </Button>
      {hasCrlv && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-primary"
          onClick={handleDownload}
          title="Baixar CRLV"
        >
          <Download className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}