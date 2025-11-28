import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calculator, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function Calculadora() {
  const [open, setOpen] = useState(false);
  const [display, setDisplay] = useState("0");
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [newNumber, setNewNumber] = useState(true);

  const handleNumber = (num: string) => {
    if (newNumber) {
      setDisplay(num);
      setNewNumber(false);
    } else {
      setDisplay(display === "0" ? num : display + num);
    }
  };

  const handleOperation = (op: string) => {
    const current = parseFloat(display);
    
    if (previousValue === null) {
      setPreviousValue(current);
    } else if (operation) {
      const result = calculate(previousValue, current, operation);
      setDisplay(String(result));
      setPreviousValue(result);
    }
    
    setOperation(op);
    setNewNumber(true);
  };

  const calculate = (a: number, b: number, op: string): number => {
    switch (op) {
      case "+": return a + b;
      case "-": return a - b;
      case "*": return a * b;
      case "/": return b !== 0 ? a / b : 0;
      default: return b;
    }
  };

  const handleEquals = () => {
    if (operation && previousValue !== null) {
      const result = calculate(previousValue, parseFloat(display), operation);
      setDisplay(String(result));
      setPreviousValue(null);
      setOperation(null);
      setNewNumber(true);
    }
  };

  const handleClear = () => {
    setDisplay("0");
    setPreviousValue(null);
    setOperation(null);
    setNewNumber(true);
  };

  const handleDecimal = () => {
    if (!display.includes(".")) {
      setDisplay(display + ".");
      setNewNumber(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="icon"
        className="fixed bottom-4 right-4 h-12 w-12 rounded-full shadow-lg z-50"
        title="Abrir Calculadora"
      >
        <Calculator className="h-5 w-5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Calculadora
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <div className="bg-muted rounded-lg p-4 text-right">
              <div className="text-3xl font-bold">{display}</div>
              {operation && previousValue !== null && (
                <div className="text-sm text-muted-foreground">
                  {previousValue} {operation}
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-4 gap-2">
              <Button variant="outline" onClick={handleClear} className="col-span-2">
                C
              </Button>
              <Button variant="outline" onClick={() => handleOperation("/")}>
                ÷
              </Button>
              <Button variant="outline" onClick={() => handleOperation("*")}>
                ×
              </Button>

              <Button variant="outline" onClick={() => handleNumber("7")}>7</Button>
              <Button variant="outline" onClick={() => handleNumber("8")}>8</Button>
              <Button variant="outline" onClick={() => handleNumber("9")}>9</Button>
              <Button variant="outline" onClick={() => handleOperation("-")}>-</Button>

              <Button variant="outline" onClick={() => handleNumber("4")}>4</Button>
              <Button variant="outline" onClick={() => handleNumber("5")}>5</Button>
              <Button variant="outline" onClick={() => handleNumber("6")}>6</Button>
              <Button variant="outline" onClick={() => handleOperation("+")}>+</Button>

              <Button variant="outline" onClick={() => handleNumber("1")}>1</Button>
              <Button variant="outline" onClick={() => handleNumber("2")}>2</Button>
              <Button variant="outline" onClick={() => handleNumber("3")}>3</Button>
              <Button onClick={handleEquals} className="row-span-2">=</Button>

              <Button variant="outline" onClick={() => handleNumber("0")} className="col-span-2">
                0
              </Button>
              <Button variant="outline" onClick={handleDecimal}>.</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}