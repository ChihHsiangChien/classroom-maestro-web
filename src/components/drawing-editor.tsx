
'use client';

import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
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

// --- Types ---
export interface DrawingEditorRef {
  getCanvasDataUrl: () => string | undefined;
}

interface DrawingEditorProps {
  backgroundImageUrl?: string;
}

type EditorTool = 'pen' | 'eraser' | 'select';

// --- Component ---
export const DrawingEditor = forwardRef<DrawingEditorRef, DrawingEditorProps>(
  ({ backgroundImageUrl }, ref) => {
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

    // Expose method to parent component
    useImperativeHandle(ref, () => ({
      getCanvasDataUrl: () => {
        const canvas = fabricCanvasRef.current;
        if (canvas) {
          return canvas.toDataURL({ format: 'png' });
        }
        return undefined;
      },
    }));

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
          const currentCanvas = fabricCanvasRef.current;
          if (currentCanvas) {
            currentCanvas.setWidth(width);
            currentCanvas.setHeight(height);
            const bgImg = currentCanvas.backgroundImage;
            if (bgImg instanceof fabric.Image && bgImg.width && bgImg.height) {
               currentCanvas.setBackgroundImage(bgImg, currentCanvas.renderAll.bind(currentCanvas), {
                   scaleX: width / bgImg.width,
                   scaleY: height / bgImg.height,
               });
            }
            currentCanvas.renderAll();
          }
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
        const currentCanvas = fabricCanvasRef.current;
        if (currentCanvas) {
            currentCanvas.dispose();
            fabricCanvasRef.current = null;
        }
      };
    }, []);

    // Effect for background image
    useEffect(() => {
        const canvas = fabricCanvasRef.current;
        if (!canvas || !backgroundImageUrl) return;

        fabric.Image.fromURL(backgroundImageUrl, (img) => {
            if (canvas.width && img.width && canvas.height && img.height) {
                canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
                    scaleX: canvas.width / img.width,
                    scaleY: canvas.height / img.height,
                    originX: 'left',
                    originY: 'top',
                });
            }
        }, { crossOrigin: 'anonymous' });
    }, [backgroundImageUrl]);

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
      } else if (tool === 'eraser') {
        // Fabric 5.x uses the PencilBrush for erasing with a different blend mode
        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
        canvas.freeDrawingBrush.width = brushWidth;
        // This is the key change for eraser functionality
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
    
    useEffect(() => {
      const handlePaste = (e: ClipboardEvent) => {
        const canvas = fabricCanvasRef.current;
        if (!canvas || !e.clipboardData) return;

        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            e.preventDefault();
            const blob = items[i].getAsFile();
            if (blob) {
              const reader = new FileReader();
              reader.onload = (event) => {
                const dataUrl = event.target?.result as string;
                fabric.Image.fromURL(dataUrl, (img) => {
                  setTool('select');
                  img.scaleToWidth((canvas.getWidth() || 500) / 2);
                  canvas.add(img);
                  canvas.centerObject(img);
                  canvas.setActiveObject(img);
                  canvas.renderAll();
                  toast({ title: "Image Pasted", description: "The image from your clipboard has been added to the canvas." });
                });
              };
              reader.readAsDataURL(blob);
            }
          }
        }
      };

      document.addEventListener('paste', handlePaste);
      return () => {
        document.removeEventListener('paste', handlePaste);
      };
    }, [toast]);

    const addText = () => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;
      setTool('select');
      const text = new fabric.Textbox('Type here', {
        left: (canvas.getWidth() || 0) / 2 - 100,
        top: (canvas.getHeight() || 0) / 2 - 20,
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
          img.scaleToWidth((canvas.getWidth() || 500) / 2);
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
        img.scaleToWidth((canvas.getWidth() || 500) / 2);
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
        // This clears objects but preserves background
        canvas.clear();
        // If you want to clear background too:
        // canvas.setBackgroundImage(null, canvas.renderAll.bind(canvas));
        canvas.backgroundColor = 'white';
        canvas.renderAll();
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
        type="button"
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
              <Button variant="outline" size="icon" type="button">
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
              <Button variant="outline" type="button">Size: {brushWidth}</Button>
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

          <Button variant="outline" size="icon" onClick={addText} type="button">
            <Type />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            type="button"
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
              <Button variant="outline" size="icon" type="button">
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
            type="button"
          >
            <Trash2 />
          </Button>
          <Button variant="outline" onClick={clearCanvas} type="button">
            Clear All
          </Button>
        </div>
        <div className="relative w-full aspect-video border rounded-md bg-white touch-none overflow-hidden">
          <canvas ref={canvasRef} className="w-full h-full" />
        </div>
      </div>
    );
  }
);
DrawingEditor.displayName = 'DrawingEditor';
