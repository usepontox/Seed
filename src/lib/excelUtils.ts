import * as XLSX from "xlsx";

export interface ExportOptions {
  sheetName?: string;
  fileName?: string;
}

export const exportToExcel = <T extends Record<string, any>>(
  data: T[],
  options: ExportOptions = {}
) => {
  const { sheetName = "Dados", fileName = "exportacao.xlsx" } = options;

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, fileName);
};

export interface ImportResult<T> {
  data: T[];
  duplicates: T[];
  newItems: T[];
}

export const importFromExcel = async <T extends Record<string, any>>(
  file: File,
  requiredColumns: string[],
  keyField: string,
  existingData: T[]
): Promise<ImportResult<T>> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          reject(new Error("Arquivo vazio"));
          return;
        }

        // Validar colunas obrigatórias
        const firstRow = jsonData[0];
        const missingColumns = requiredColumns.filter(
          (col) =>
            !Object.keys(firstRow).some(
              (key) => key.toLowerCase() === col.toLowerCase()
            )
        );

        if (missingColumns.length > 0) {
          reject(
            new Error(`Colunas obrigatórias faltando: ${missingColumns.join(", ")}`)
          );
          return;
        }

        // Normalizar nomes de colunas
        const normalizedData = jsonData.map((item) => {
          const normalized: any = {};
          Object.keys(item).forEach((key) => {
            const normalizedKey = key.toLowerCase().trim();
            normalized[normalizedKey] = item[key];
          });
          return normalized as T;
        });

        // Separar duplicatas de novos itens
        const existingKeys = new Set(
          existingData.map((item) => String(item[keyField]).toLowerCase())
        );
        
        const duplicates: T[] = [];
        const newItems: T[] = [];

        normalizedData.forEach((item) => {
          const itemKey = String(item[keyField]).toLowerCase();
          if (existingKeys.has(itemKey)) {
            duplicates.push(item);
          } else {
            newItems.push(item);
          }
        });

        resolve({
          data: normalizedData,
          duplicates,
          newItems,
        });
      } catch (error: any) {
        reject(new Error("Erro ao processar arquivo: " + error.message));
      }
    };

    reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
    reader.readAsBinaryString(file);
  });
};
