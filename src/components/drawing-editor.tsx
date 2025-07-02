
'use client';

import React, { useRef, useEffect, useState } from 'react';
import { fabric } from 'fabric';
import {
  Trash2,
  Image as ImageIcon,
  Camera,
  Type,
  PenLine,
  Eraser,
  MousePointer,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Slider } from './ui/slider';
import { Input } from './ui/input';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from './ui/dialog';

// --- Drawing Editor Component ---
interface DrawingEditorProps {
  onSubmit: (dataUrl: string) => void;
}

type EditorTool = 'pen' | 'eraser' | 'select';

export const DrawingEditor = ({ onSubmit }: DrawingEditorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tool state
  const [tool, setTool] = useState<EditorTool>('pen');
  const [brushWidth, setBrushWidth] = useState(5);
  const [brushColor, setBrushColor] = useState('#000000');

  // Camera state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraDialogOpen, setIsCameraDialogOpen] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<
    boolean | null
  >(null);

  const { toast } = useToast();

  useEffect(() => {
    if (!canvasRef.current?.parentElement) return;

    const parentElement = canvasRef.current.parentElement;
    const canvas = new fabric.Canvas(canvasRef.current, {
      backgroundColor: 'white',
      isDrawingMode: true,
    });
    fabricCanvasRef.current = canvas;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        canvas.setWidth(width);
        canvas.setHeight(height);
        canvas.renderAll();
      }
    });

    resizeObserver.observe(parentElement);

    // Initial resize to set the canvas size as soon as possible.
    const { offsetWidth, offsetHeight } = parentElement;
    canvas.setWidth(offsetWidth);
    canvas.setHeight(offsetHeight);
    canvas.renderAll();

    return () => {
      resizeObserver.disconnect();
      fabricCanvasRef.current?.dispose();
      fabricCanvasRef.current = null;
    };
  }, []);

  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    canvas.isDrawingMode = tool === 'pen' || tool === 'eraser';
    if (tool === 'select') {
      canvas.isDrawingMode = false;
    } else if (tool === 'pen') {
      canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
      canvas.freeDrawingBrush.color = brushColor;
      canvas.freeDrawingBrush.width = brushWidth;
      // Ensure we are in normal drawing mode
      canvas.freeDrawingBrush.globalCompositeOperation = 'source-over';
    } else if (tool === 'eraser') {
      // In Fabric.js v5+, the eraser is a PencilBrush with a 'destination-out' composite operation.
      canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
      canvas.freeDrawingBrush.width = brushWidth;
      canvas.freeDrawingBrush.globalCompositeOperation = 'destination-out';
    }
  }, [tool, brushColor, brushWidth]);

  useEffect(() => {
    if (!isCameraDialogOpen) {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream)
          .getTracks()
          .forEach((track) => track.stop());
      }
      return;
    }

    const getCameraPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        setHasCameraPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description:
            'Please enable camera permissions in your browser settings to use this app.',
        });
      }
    };
    getCameraPermission();
  }, [isCameraDialogOpen, toast]);

  const addText = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    setTool('select');
    const text = new fabric.Textbox('Type here', {
      left: canvas.getWidth() / 2 - 100,
      top: canvas.getHeight() / 2 - 20,
      width: 200,
      fontSize: 24,
      fill: brushColor,
      textAlign: 'center',
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (f) => {
      const data = f.target?.result as string;
      fabric.Image.fromURL(data, (img) => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;
        setTool('select');
        img.scaleToWidth(canvas.getWidth() / 2);
        canvas.add(img);
        canvas.centerObject(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
      });
    };
    reader.readAsDataURL(file);
    if (e.target) e.target.value = '';
  };

  const captureFromCamera = () => {
    const canvas = fabricCanvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || !hasCameraPermission) return;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = video.videoWidth;
    tempCanvas.height = video.videoHeight;
    tempCanvas.getContext('2d')?.drawImage(video, 0, 0);

    fabric.Image.fromURL(tempCanvas.toDataURL(), (img) => {
      setTool('select');
      img.scaleToWidth(canvas.getWidth() / 2);
      canvas.add(img);
      canvas.centerObject(img);
      canvas.setActiveObject(img);
      canvas.renderAll();
    });
    setIsCameraDialogOpen(false);
  };

  const deleteSelected = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length) {
      activeObjects.forEach((obj) => canvas.remove(obj));
      canvas.discardActiveObject();
      canvas.renderAll();
    }
  };

  const clearCanvas = () => {
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      canvas.clear();
      canvas.backgroundColor = 'white';
      canvas.renderAll();
    }
  };

  const handleSubmit = () => {
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL({ format: 'png' });
      onSubmit(dataUrl);
    }
  };

  const ToolButton = ({
    name,
    icon,
    ...props
  }: { name: EditorTool; icon: React.ReactNode } & React.ComponentProps<
    typeof Button
  >) => (
    <Button
      variant={tool === name ? 'secondary' : 'outline'}
      size="icon"
      onClick={() => setTool(name)}
      {...props}
    >
      {icon} <span className="sr-only">{name}</span>
    </Button>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 rounded-md border p-2 bg-muted/50">
        <ToolButton name="select" icon={<MousePointer />} />
        <ToolButton name="pen" icon={<PenLine />} />
        <ToolButton name="eraser" icon={<Eraser />} />

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon">
              <div
                className="h-4 w-4 rounded-full border"
                style={{ backgroundColor: brushColor }}
              />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2">
            <Input
              type="color"
              value={brushColor}
              onChange={(e) => setBrushColor(e.target.value)}
              className="h-10 w-10 p-1"
            />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">Size: {brushWidth}</Button>
          </PopoverTrigger>
          <PopoverContent>
            <Slider
              defaultValue={[brushWidth]}
              min={1}
              max={50}
              step={1}
              onValueChange={(val) => setBrushWidth(val[0])}
            />
          </PopoverContent>
        </Popover>

        <div className="h-6 w-px bg-border mx-2" />

        <Button variant="outline" size="icon" onClick={addText}>
          <Type />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
        >
          <ImageIcon />
        </Button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageUpload}
          className="hidden"
          accept="image/*"
        />
        <Dialog open={isCameraDialogOpen} onOpenChange={setIsCameraDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="icon">
              <Camera />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Take a Picture</DialogTitle>
            </DialogHeader>
            <div className="relative">
              <video
                ref={videoRef}
                className="w-full aspect-video rounded-md bg-black"
                autoPlay
                muted
                playsInline
              />
              {hasCameraPermission === false && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Alert variant="destructive">
                    <AlertTitle>Camera Access Denied</AlertTitle>
                    <AlertDescription>
                      Please allow camera access in your browser.
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost">Cancel</Button>
              </DialogClose>
              <Button onClick={captureFromCamera} disabled={!hasCameraPermission}>
                Capture
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="h-6 w-px bg-border mx-2" />

        <Button
          variant="outline"
          size="icon"
          className="text-destructive hover:text-destructive"
          onClick={deleteSelected}
        >
          <Trash2 />
        </Button>
        <Button variant="outline" onClick={clearCanvas}>
          Clear All
        </Button>
      </div>
      <div className="relative w-full aspect-video border rounded-md bg-white touch-none overflow-hidden">
        <canvas ref={canvasRef} className="h-full w-full" />
      </div>
      <div className="flex justify-end">
        <Button onClick={handleSubmit}>Submit Drawing</Button>
      </div>
    </div>
  );
};
