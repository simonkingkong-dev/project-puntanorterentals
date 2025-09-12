import * as React from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

import { cn } from '@/lib/utils';
import { ButtonProps, buttonVariants } from '@/components/ui/button';

const Pagination = ({ className, ...props }: React.ComponentProps<'nav'>) => (
  <nav
    role="navigation"
    aria-label="pagination"
    className={cn('mx-auto flex w-full justify-center', className)}
    {...props}
  />
);
Pagination.displayName = 'Pagination';

const PaginationContent = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<'ul'>
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    className={cn('flex flex-row items-center gap-1', className)}
    {...props}
  />
));
PaginationContent.displayName = 'PaginationContent';

const PaginationItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<'li'>
>(({ className, ...props }, ref) => (
  <li ref={ref} className={cn('', className)} {...props} />
));
PaginationItem.displayName = 'PaginationItem';

type PaginationLinkProps = {
  isActive?: boolean;
} & Pick<ButtonProps, 'size'> &
  React.ComponentProps<'a'>;

/**
* Renders a pagination link component with conditional styling based on active state.
* @example
* PaginationLink({ className: 'custom-class', isActive: true, size: 'large' })
* <a class="button outline large custom-class" aria-current="page" ...props />
* @param {Object} PaginationLinkProps - Properties to configure the pagination link.
* @param {string} PaginationLinkProps.className - Additional class names for the link.
* @param {boolean} PaginationLinkProps.isActive - Determines if the link is the active page.
* @param {string} [PaginationLinkProps.size='icon'] - The size variant of the button.
* @param {Object} PaginationLinkProps.props - Additional props to be spread onto the <a> element.
* @returns {JSX.Element} A styled anchor element that acts as a pagination link.
**/
const PaginationLink = ({
  className,
  isActive,
  size = 'icon',
  ...props
}: PaginationLinkProps) => (
  <a
    aria-current={isActive ? 'page' : undefined}
    className={cn(
      buttonVariants({
        variant: isActive ? 'outline' : 'ghost',
        size,
      }),
      className
    )}
    {...props}
  />
);
PaginationLink.displayName = 'PaginationLink';

/**
* Renders a pagination link component for navigating to the previous page.
* @example
* renderPaginationLink({ className: 'custom-class', href: '/previous-page' })
* Returns a JSX element displaying a navigational link with a "Previous" label and a left chevron icon.
* @param {Object} paginationLinkProps - The props for the PaginationLink component.
* @param {string} paginationLinkProps.className - Additional class names for custom styling.
* @param {Object} paginationLinkProps.props - Additional props to be spread onto the PaginationLink component.
* @returns {JSX.Element} The PaginationLink component for navigating to the previous page.
**/
const PaginationPrevious = ({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink
    aria-label="Go to previous page"
    size="default"
    className={cn('gap-1 pl-2.5', className)}
    {...props}
  >
    <ChevronLeft className="h-4 w-4" />
    <span>Previous</span>
  </PaginationLink>
);
PaginationPrevious.displayName = 'PaginationPrevious';

/**
* Renders a pagination link component for navigating to the next page.
* @example
* PaginationLinkComponent({ className: 'custom-class', someProp: value })
* Returns a React component for the next page link with additional props.
* @param {React.ComponentProps<typeof PaginationLink>} params - An object containing the className and other props for the PaginationLink.
* @returns {JSX.Element} A JSX element representing a pagination link to the next page.
**/
const PaginationNext = ({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink
    aria-label="Go to next page"
    size="default"
    className={cn('gap-1 pr-2.5', className)}
    {...props}
  >
    <span>Next</span>
    <ChevronRight className="h-4 w-4" />
  </PaginationLink>
);
PaginationNext.displayName = 'PaginationNext';

/**
* Renders a span element with a customizable class name and additional properties, including an icon and hidden text for accessibility.
* @example
* renderSpanWithIcon({ className: 'custom-class', id: 'icon-span' })
* // Returns a span element with the specified class name and ID, containing an icon and screen reader text.
* @param {Object} props - Contains properties and className for the span element.
* @param {string} props.className - A string representing additional class names for the span element.
* @param {Object} props.props - Other properties to be applied to the span element.
* @returns {JSX.Element} A span element with additional styling, an icon for display, and aria-hidden text for accessibility.
**/
const PaginationEllipsis = ({
  className,
  ...props
}: React.ComponentProps<'span'>) => (
  <span
    aria-hidden
    className={cn('flex h-9 w-9 items-center justify-center', className)}
    {...props}
  >
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">More pages</span>
  </span>
);
PaginationEllipsis.displayName = 'PaginationEllipsis';

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
};
