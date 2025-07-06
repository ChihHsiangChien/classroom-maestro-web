
'use client';

import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef, useCallback } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { useI18n } from '@/lib/i18n/provider';

// --- Types ---
export interface DrawingEditorRef {
  getCanvasDataUrl: () => string | undefined;
  addImageFromUrl: (url: string) => void;
}

interface DrawingEditorProps {
  backgroundImageUrl?: string;
}

type EditorTool = 'pen' | 'eraser' | 'select';

// --- Component ---
export const DrawingEditor = forwardRef<DrawingEditorRef, DrawingEditorProps>(
  ({ backgroundImageUrl }, ref) => {
    const { t } = useI18n();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const colorInputRef = useRef<HTMLInputElement>(null);

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
    const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
    const [selectedCamera, setSelectedCamera] = useState<string>('');


    const { toast } = useToast();

    const addImageFromUrl = useCallback((dataUrl: string) => {
      fabric.Image.fromURL(dataUrl, (img) => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;
        setTool('select');
        img.scaleToWidth((canvas.getWidth() || 500) / 2);
        canvas.add(img);
        canvas.centerObject(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
      }, { crossOrigin: 'anonymous' });
    }, []);

    // Expose method to parent component
    useImperativeHandle(ref, () => ({
      getCanvasDataUrl: () => {
        const canvas = fabricCanvasRef.current;
        if (canvas) {
          return canvas.toDataURL({ format: 'png' });
        }
        return undefined;
      },
      addImageFromUrl,
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
            const currentCanvas = fabricCanvasRef.current;
            // Guard against the component being unmounted before the image loads.
            if (!currentCanvas) {
                return;
            }
            if (currentCanvas.width && img.width && currentCanvas.height && img.height) {
                currentCanvas.setBackgroundImage(img, currentCanvas.renderAll.bind(currentCanvas), {
                    scaleX: currentCanvas.width / img.width,
                    scaleY: currentCanvas.height / img.height,
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
        // In Fabric.js 5.x, there is a dedicated EraserBrush.
        canvas.freeDrawingBrush = new fabric.EraserBrush(canvas);
        canvas.freeDrawingBrush.width = brushWidth;
      }
    }, [tool, brushColor, brushWidth]);

    const getCameraPermission = useCallback(async (deviceId: string) => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: deviceId ? { exact: deviceId } : undefined },
        });
        setHasCameraPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: t('drawingEditor.camera_access_denied_title'),
          description: t('drawingEditor.camera_access_denied_description'),
        });
      }
    }, [toast, t]);
    
    useEffect(() => {
        const setupCamera = async () => {
          if (!isCameraDialogOpen) {
            if (videoRef.current?.srcObject) {
              (videoRef.current.srcObject as MediaStream)
                .getTracks()
                .forEach((track) => track.stop());
            }
            return;
          }
    
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = devices.filter(
            (device) => device.kind === 'videoinput'
          );
          setCameras(videoDevices);
    
          const currentCameraId = selectedCamera || videoDevices[0]?.deviceId;
          if (currentCameraId) {
            if (!selectedCamera) {
              setSelectedCamera(currentCameraId);
            }
            getCameraPermission(currentCameraId);
          } else {
            // No camera found, or permission denied before enumeration
            setHasCameraPermission(false);
          }
        };
    
        setupCamera();
    
        return () => {
          if (videoRef.current?.srcObject) {
            (videoRef.current.srcObject as MediaStream)
              .getTracks()
              .forEach((track) => track.stop());
          }
        };
      }, [isCameraDialogOpen, selectedCamera, getCameraPermission]);

    useEffect(() => {
      const handlePaste = (e: ClipboardEvent) => {
        if (!e.clipboardData) return;

        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            e.preventDefault();
            const blob = items[i].getAsFile();
            if (blob) {
              const reader = new FileReader();
              reader.onload = (event) => {
                const dataUrl = event.target?.result as string;
                addImageFromUrl(dataUrl);
                toast({ 
                  title: t('drawingEditor.toast_image_pasted_title'), 
                  description: t('drawingEditor.toast_image_pasted_description') 
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
    }, [toast, t, addImageFromUrl]);

    const addText = () => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;
      setTool('select');
      const text = new fabric.Textbox(t('drawingEditor.text_default'), {
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
        addImageFromUrl(data);
      };
      reader.readAsDataURL(file);
      if (e.target) e.target.value = '';
    };

    const captureFromCamera = () => {
      const video = videoRef.current;
      if (!video || !hasCameraPermission) return;

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = video.videoWidth;
      tempCanvas.height = video.videoHeight;
      tempCanvas.getContext('2d')?.drawImage(video, 0, 0);
      addImageFromUrl(tempCanvas.toDataURL());
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
          <ToolButton name="select" icon={<MousePointer />} title={t('drawingEditor.select_tool')} />
          <ToolButton name="pen" icon={<PenLine />} title={t('drawingEditor.pen_tool')} />
          <ToolButton name="eraser" icon={<Eraser />} title={t('drawingEditor.eraser_tool')} />

          <Button
            variant="outline"
            size="icon"
            type="button"
            title={t('drawingEditor.color_picker_tool')}
            onClick={() => colorInputRef.current?.click()}
          >
            <div
              className="h-4 w-4 rounded-full border"
              style={{ backgroundColor: brushColor }}
            />
          </Button>
          <Input
            ref={colorInputRef}
            type="color"
            value={brushColor}
            onChange={(e) => setBrushColor(e.target.value)}
            className="invisible h-0 w-0 border-0 p-0"
          />

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" type="button">{`Size: ${brushWidth}`}</Button>
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

          <Button variant="outline" size="icon" onClick={addText} type="button" title={t('drawingEditor.add_text_tool')}>
            <Type />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            type="button"
            title={t('drawingEditor.upload_image_tool')}
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
              <Button variant="outline" size="icon" type="button" title={t('drawingEditor.camera_tool')}>
                <Camera />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('drawingEditor.take_a_picture_title')}</DialogTitle>
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
                      <AlertTitle>{t('drawingEditor.camera_access_denied_title')}</AlertTitle>
                      <AlertDescription>
                        {t('drawingEditor.camera_access_denied_description')}
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
              </div>
                {cameras.length > 1 && (
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="camera-select" className="text-right">
                            {t('drawingEditor.camera_select_label')}
                        </Label>
                        <Select onValueChange={setSelectedCamera} value={selectedCamera}>
                            <SelectTrigger id="camera-select" className="col-span-3">
                                <SelectValue placeholder={t('drawingEditor.camera_select_placeholder')} />
                            </SelectTrigger>
                            <SelectContent>
                                {cameras.map((camera) => (
                                    <SelectItem key={camera.deviceId} value={camera.deviceId}>
                                        {camera.label || `Camera ${cameras.indexOf(camera) + 1}`}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="ghost">{t('common.cancel')}</Button>
                </DialogClose>
                <Button onClick={captureFromCamera} disabled={!hasCameraPermission}>
                  {t('drawingEditor.capture_button')}
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
            title={t('drawingEditor.delete_selected_tool')}
          >
            <Trash2 />
          </Button>
          <Button variant="outline" onClick={clearCanvas} type="button">
            {t('drawingEditor.clear_all_button')}
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
