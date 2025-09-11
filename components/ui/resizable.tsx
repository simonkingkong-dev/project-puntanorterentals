'use client';

import { GripVertical } from 'lucide-react';
import * as ResizablePrimitive from 'react-resizable-panels';

import { cn } from '@/lib/utils';

/**
* A function to render a resizable panel group component with a customizable className and additional props.
* @example
* renderPanelGroup({ className: 'custom-class', id: 'panel-group-1' })
* <ResizablePrimitive.PanelGroup className="custom-class flex h-full w-full data-[panel-group-direction=vertical]:flex-col" id="panel-group-1" />
* @param {Object} { className: string, ...props: React.ComponentProps<typeof ResizablePrimitive.PanelGroup> } - An object containing a className to customize the component's styling and any additional props to pass to the ResizablePrimitive.PanelGroup.
* @returns {JSX.Element} A ResizablePrimitive.PanelGroup component with the specified className and additional props.
**/
const ResizablePanelGroup = ({
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelGroup>) => (
  <ResizablePrimitive.PanelGroup
    className={cn(
      'flex h-full w-full data-[panel-group-direction=vertical]:flex-col',
      className
    )}
    {...props}
  />
);

const ResizablePanel = ResizablePrimitive.Panel;

/**
* Renders a resizable panel handle component with optional visual handle.
* @example
* renderResizableHandle({ withHandle: true, className: 'custom-class' })
* // Renders a resizable panel handle component with a grip handle.
* @param {Object} props - The component props.
* @param {boolean} [props.withHandle] - Whether to display a visual handle for gripping.
* @param {string} [props.className] - Additional CSS classes to apply to the handle.
* @returns {JSX.Element} A rendered PanelResizeHandle component.
**/
const ResizableHandle = ({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelResizeHandle> & {
  withHandle?: boolean;
}) => (
  <ResizablePrimitive.PanelResizeHandle
    className={cn(
      'relative flex w-px items-center justify-center bg-border after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:h-1 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:-translate-y-1/2 data-[panel-group-direction=vertical]:after:translate-x-0 [&[data-panel-group-direction=vertical]>div]:rotate-90',
      className
    )}
    {...props}
  >
    {withHandle && (
      <div className="z-10 flex h-4 w-3 items-center justify-center rounded-sm border bg-border">
        <GripVertical className="h-2.5 w-2.5" />
      </div>
    )}
  </ResizablePrimitive.PanelResizeHandle>
);

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
