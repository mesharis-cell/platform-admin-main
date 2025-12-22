# Component Library

Quick reference for all UI components in the repo. You can open up and refer to any individual file as well. You are allowed to edit the files as well if required.

---

**Path:** `src/components/ui/accordion.tsx`
**What:** Multiple related collapsible sections with unified behavior
**When:** FAQs, settings panels with multiple sections, grouped expandable content (use Collapsible for single items)
**Usage:** Nest as Accordion > AccordionItem > AccordionTrigger + AccordionContent

---

**Path:** `src/components/ui/alert-dialog.tsx`
**What:** Modal dialog that interrupts user with important content requiring confirmation
**When:** Confirm destructive actions, critical warnings, require user decision before proceeding
**Usage:** AlertDialog > AlertDialogTrigger + AlertDialogContent (Header, Title, Description, Footer with Action/Cancel)

---

**Path:** `src/components/ui/alert.tsx`
**What:** Non-interactive callout box for displaying important messages
**When:** Success messages, error notifications, informational banners, warning messages
**Usage:** Alert container with AlertTitle and AlertDescription, supports default and destructive variants

---

**Path:** `src/components/ui/aspect-ratio.tsx`
**What:** Container that maintains consistent width-to-height ratio
**When:** Displaying images, videos, embedded content needing consistent proportions
**Usage:** Wrap content in AspectRatio with ratio prop (e.g., ratio={16/9})

---

**Path:** `src/components/ui/avatar.tsx`
**What:** Circular user profile picture with fallback support
**When:** User profiles, comment sections, navigation headers, user lists
**Usage:** Avatar > AvatarImage (with src) + AvatarFallback (backup content like initials)

---

**Path:** `src/components/ui/avatar-stack.tsx`
**What:** Overlapping avatar display with optional hover animation
**When:** Showing multiple users, team members, participants in compact space
**Usage:** AvatarStack with animate and size props containing Avatar components

---

**Path:** `src/components/ui/badge.tsx`
**What:** Small inline label for highlighting status or categories
**When:** Status indicators, tags, notification counts, category labels
**Usage:** Badge component with variant prop (default, secondary, destructive, outline)

---

**Path:** `src/components/ui/breadcrumb.tsx`
**What:** Navigation showing current page location within site hierarchy
**When:** Multi-level navigation, showing user's location in deep page structures
**Usage:** Breadcrumb > BreadcrumbList > BreadcrumbItem with BreadcrumbLink/BreadcrumbPage

---

**Path:** `src/components/ui/button.tsx`
**What:** Interactive clickable element with multiple visual styles
**When:** Triggering actions, form submissions, navigation, any clickable interaction
**Usage:** Button with variant (default, destructive, outline, secondary, ghost, link) and size props

---

**Path:** `src/components/ui/calendar.tsx`
**What:** Interactive date picker with month/year navigation
**When:** Date input fields, scheduling interfaces, date range selection
**Usage:** Calendar component with selected and onSelect props from react-day-picker

---

**Path:** `src/components/ui/card.tsx`
**What:** Container with border and shadow for grouping related content
**When:** Grouped information, product items, content previews, dashboard widgets
**Usage:** Card container with CardHeader (Title, Description), CardContent, and CardFooter

---

**Path:** `src/components/ui/carousel.tsx`
**What:** Slideshow component for cycling through items with navigation
**When:** Image galleries, product showcases, testimonials, content sliders
**Usage:** Carousel wrapper with CarouselContent > CarouselItem, includes CarouselPrevious/Next buttons

---

**Path:** `src/components/ui/callout.tsx`
**What:** Styled alert box with variants and optional icon
**When:** Important messages, alerts, tips, warnings in content areas
**Usage:** Callout with title, variant (default/success/error/warning/neutral), and icon props

---

**Path:** `src/components/ui/chart.tsx`
**What:** Wrapper for Recharts library providing themed charts
**When:** Data visualization, analytics dashboards, showing metrics and trends
**Usage:** ChartContainer with config wrapping Recharts components, use ChartTooltip/ChartLegend

---

**Path:** `src/components/ui/checkbox.tsx`
**What:** Binary input control for toggling true/false values
**When:** Form selections, agreeing to terms, multi-select lists, feature toggles
**Usage:** Checkbox component with checked and onCheckedChange props

---

**Path:** `src/components/ui/choicebox.tsx`
**What:** Enhanced radio group with card-style selection options
**When:** Form selections needing detailed descriptions, plan selection, settings
**Usage:** Choicebox > ChoiceboxItem > ChoiceboxItemHeader/Title/Subtitle/Description with ChoiceboxIndicator

---

**Path:** `src/components/ui/collapsible.tsx`
**What:** Single standalone expandable container
**When:** Individual show/hide sections, one-off expandable content (use Accordion for multiple related items)
**Usage:** Collapsible wrapper with CollapsibleTrigger and CollapsibleContent

---

**Path:** `src/components/ui/confetti.tsx`
**What:** Canvas-based confetti animation with manual or auto-trigger
**When:** Celebrations, success states, achievements, gamification
**Usage:** Confetti with ref and options, or ConfettiButton for click-triggered animations

---

**Path:** `src/components/ui/command.tsx`
**What:** Command palette/search menu with keyboard navigation
**When:** Quick actions menu, search interfaces, keyboard shortcuts menu
**Usage:** Command/CommandDialog with CommandInput, CommandList containing CommandGroup > CommandItem

---

**Path:** `src/components/ui/context-menu.tsx`
**What:** Right-click menu that appears on element interaction
**When:** Additional actions on items, right-click functionality, context-specific options
**Usage:** ContextMenu > ContextMenuTrigger wrapping element + ContextMenuContent with MenuItem

---

**Path:** `src/components/ui/copy-button.tsx`
**What:** Animated button with state transitions for copy operations
**When:** Code snippets, API keys, shareable links, any copyable content
**Usage:** ButtonCopy with onCopy async callback and optional duration prop

---

**Path:** `src/components/ui/credit-card.tsx`
**What:** Flippable 3D credit card display with front/back faces
**When:** Payment forms, card management UIs, checkout flows
**Usage:** CreditCard > CreditCardFlipper > CreditCardFront/Back with Number, Name, Expiry, CVV, Logo

---

**Path:** `src/components/ui/dialog.tsx`
**What:** Modal overlay for focused content requiring user attention
**When:** Forms, confirmations, detail views, content requiring focus
**Usage:** Dialog > DialogTrigger + DialogContent (Header with Title/Description, Footer)

---

**Path:** `src/components/ui/drawer.tsx`
**What:** Mobile-optimized bottom sheet with native swipe gestures
**When:** Mobile-only bottom sheets, mobile actions/filters with swipe-to-close (use Sheet for desktop or multi-directional panels)
**Usage:** Drawer > DrawerTrigger + DrawerContent (Header, Footer) using Vaul library

---

**Path:** `src/components/ui/dropdown-menu.tsx`
**What:** Dropdown menu with items triggered by button click
**When:** Navigation menus, action lists, settings menus, item options
**Usage:** DropdownMenu > DropdownMenuTrigger + DropdownMenuContent with MenuItem/CheckboxItem

---

**Path:** `src/components/ui/field.tsx`
**What:** Comprehensive form field wrapper with labels, descriptions, and errors
**When:** Building forms with consistent styling and validation feedback
**Usage:** Field with orientation prop > FieldLabel, FieldContent, FieldDescription, FieldError

---

**Path:** `src/components/ui/form.tsx`
**What:** React Hook Form integration with accessible form controls
**When:** All forms requiring validation, complex form state, accessible forms
**Usage:** Form wrapper (FormProvider) with FormField > FormItem (Label, Control, Description, Message)

---

**Path:** `src/components/ui/hover-card.tsx`
**What:** Popover that displays when hovering over trigger element
**When:** User profile previews, additional information on hover, contextual details
**Usage:** HoverCard > HoverCardTrigger wrapping element + HoverCardContent

---

**Path:** `src/components/ui/image-crop.tsx`
**What:** Interactive image cropper with aspect ratio control and PNG export
**When:** Profile picture uploads, image editing, photo galleries requiring specific dimensions
**Usage:** ImageCrop with file and aspect props, onCrop callback > ImageCropContent

---

**Path:** `src/components/ui/image-zoom.tsx`
**What:** Click-to-zoom image viewer with modal overlay
**When:** Product images, gallery views, detailed image inspection
**Usage:** ImageZoom wrapping img element

---

**Path:** `src/components/ui/infinite-slider.tsx`
**What:** Continuous auto-scrolling carousel with hover speed control
**When:** Logo showcases, testimonials, content feeds requiring constant motion
**Usage:** InfiniteSlider with speed, speedOnHover, direction, and reverse props

---

**Path:** `src/components/ui/input-otp.tsx`
**What:** Segmented input for one-time passwords with individual character slots
**When:** Two-factor authentication, verification codes, PIN entry
**Usage:** InputOTP with maxLength, groups via InputOTPGroup > InputOTPSlot

---

**Path:** `src/components/ui/input.tsx`
**What:** Standard single-line text input field
**When:** Text entry, email fields, search boxes, any single-line user input
**Usage:** Input component as controlled/uncontrolled with standard input props

---

**Path:** `src/components/ui/label.tsx`
**What:** Accessible text label for form inputs
**When:** Labeling form fields, improving accessibility for inputs
**Usage:** Label with input using htmlFor attribute

---

**Path:** `src/components/ui/menubar.tsx`
**What:** Horizontal menu bar with multiple dropdown menus
**When:** Application menu bars, desktop-style navigation, multiple menu categories
**Usage:** Menubar > MenubarMenu (Trigger + Content with Item/CheckboxItem/RadioItem)

---

**Path:** `src/components/ui/navigation-menu.tsx`
**What:** Accessible navigation with dropdown content panels
**When:** Main site navigation, mega menus, multi-level navigation headers
**Usage:** NavigationMenu > NavigationMenuList > NavigationMenuItem (Trigger + Content)

---

**Path:** `src/components/ui/pagination.tsx`
**What:** Navigation controls for paginated content
**When:** Table pagination, search results, long lists split across pages
**Usage:** Pagination > PaginationContent > PaginationItem with PaginationLink/Previous/Next

---

**Path:** `src/components/ui/popover.tsx`
**What:** Floating content panel anchored to trigger element
**When:** Tooltips with interactive content, date pickers, color selectors
**Usage:** Popover > PopoverTrigger + PopoverContent with positioning options

---

**Path:** `src/components/ui/progress.tsx`
**What:** Visual progress indicator showing completion percentage
**When:** Loading states, upload progress, multi-step form completion
**Usage:** Progress component with value prop (0-100)

---

**Path:** `src/components/ui/progressive-blur.tsx`
**What:** Layered backdrop blur effect with directional gradient masks
**When:** Content edges, scroll indicators, image overlays requiring smooth blur transitions
**Usage:** ProgressiveBlur with direction, blurLayers, and blurIntensity props

---

**Path:** `src/components/ui/radio-group.tsx`
**What:** Group of mutually exclusive radio button options
**When:** Single selection from multiple options, settings choices, survey questions
**Usage:** RadioGroup wrapper with multiple RadioGroupItem elements

---

**Path:** `src/components/ui/resizable.tsx`
**What:** Draggable panel system for adjustable layouts
**When:** Split panes, adjustable sidebars, multi-column layouts
**Usage:** ResizablePanelGroup with multiple ResizablePanel separated by ResizableHandle

---

**Path:** `src/components/ui/scroll-area.tsx`
**What:** Custom styled scrollable container with consistent scrollbars
**When:** Fixed height containers with overflow, custom scrollbar styling
**Usage:** Wrap content in ScrollArea, optionally add ScrollBar

---

**Path:** `src/components/ui/select.tsx`
**What:** Dropdown selection menu for choosing single option from list
**When:** Form dropdowns, filtering options, single-choice selections
**Usage:** Select > SelectTrigger (with SelectValue) + SelectContent > SelectItem

---

**Path:** `src/components/ui/separator.tsx`
**What:** Visual divider line for separating content sections
**When:** Dividing menu items, separating content blocks
**Usage:** Separator with orientation prop (horizontal/vertical)

---

**Path:** `src/components/ui/social-selector.tsx`
**What:** Animated platform switcher for social media profiles
**When:** Profile pages, social media aggregators, contact sections with multiple platforms
**Usage:** SocialSelector with platforms array, handle, and onChange callback

---

**Path:** `src/components/ui/sheet.tsx`
**What:** Versatile slide-in panel from any edge (desktop-friendly)
**When:** Desktop side panels, navigation, filters, settings, any direction needed (use Drawer for mobile-only bottom sheets)
**Usage:** Sheet > SheetTrigger + SheetContent with side prop (left, right, top, bottom)

---

**Path:** `src/components/ui/sidebar.tsx`
**What:** Collapsible sidebar navigation with mobile responsive behavior
**When:** Application navigation, dashboard layouts, persistent menu structures
**Usage:** SidebarProvider > Sidebar (Header, Content, Footer) + SidebarInset for main content

---

**Path:** `src/components/ui/skeleton.tsx`
**What:** Placeholder loading state with pulsing animation
**When:** Loading content, lazy-loaded images, pending data states
**Usage:** Skeleton as empty div placeholder matching target content dimensions

---

**Path:** `src/components/ui/slider.tsx`
**What:** Interactive range input with draggable thumb
**When:** Volume controls, price ranges, numeric value selection
**Usage:** Slider with value, min, max, step, and onValueChange props

---

**Path:** `src/components/ui/sonner.tsx`
**What:** Toast notification system using Sonner library
**When:** Success messages, error notifications, temporary feedback throughout app
**Usage:** Add Toaster to app root, trigger via sonner's toast() function

---

**Path:** `src/components/ui/switch.tsx`
**What:** Toggle switch for binary on/off states
**When:** Settings toggles, feature enables/disables, boolean preferences
**Usage:** Switch component with checked and onCheckedChange props

---

**Path:** `src/components/ui/table.tsx`
**What:** Structured data table with header, body, and footer sections
**When:** Data grids, list views, structured tabular data display
**Usage:** Table > TableHeader (TableRow > TableHead) + TableBody (TableRow > TableCell)

---

**Path:** `src/components/ui/tabs.tsx`
**What:** Tabbed interface for switching between multiple content panels
**When:** Organizing related content, settings sections, multi-view interfaces
**Usage:** Tabs with defaultValue > TabsList (TabsTrigger) + TabsContent for each tab

---

**Path:** `src/components/ui/textarea.tsx`
**What:** Multi-line text input field
**When:** Long text entry, comments, descriptions, messages
**Usage:** Textarea component with standard textarea props (rows, placeholder, value, onChange)

---

**Path:** `src/components/ui/theme-switcher.tsx`
**What:** Animated theme toggle with light/dark/system modes
**When:** App settings, navigation bars, user preferences for theme control
**Usage:** ThemeSwitcher with value, onChange, and optional defaultValue props

---

**Path:** `src/components/ui/toggle-group.tsx`
**What:** Group of mutually exclusive or multi-select toggle buttons
**When:** View switchers (grid/list), formatting options, filter selections
**Usage:** ToggleGroup with type (single/multiple) > ToggleGroupItem elements

---

**Path:** `src/components/ui/toggle.tsx`
**What:** Single pressable button with on/off state
**When:** Toolbar buttons, formatting controls, feature toggles with visual state
**Usage:** Toggle with pressed state, supports default and outline variants

---

**Path:** `src/components/ui/tooltip.tsx`
**What:** Small informational popup on hover with minimal content
**When:** Icon explanations, additional context, help text, brief descriptions
**Usage:** TooltipProvider wrapper with Tooltip > TooltipTrigger + TooltipContent

---

**Path:** `src/components/ui/typewriter-text.tsx`
**What:** Animated typing and deleting text effect with cursor
**When:** Hero sections, landing pages, dynamic headings, attention-grabbing text
**Usage:** TypingAnimation with words array, loop, typeSpeed, and showCursor props

---

## Block Components

Pre-built complex components combining multiple UI elements.

---

**Path:** `src/components/blocks/color-picker.tsx`
**What:** Advanced HSL color picker with multiple format outputs and eyedropper
**When:** Theme customization, design tools, color selection interfaces
**Usage:** ColorPicker > ColorPickerSelection, ColorPickerHue, ColorPickerAlpha, ColorPickerFormat

---

**Path:** `src/components/blocks/kanban.tsx`
**What:** Drag-and-drop kanban board with sortable cards using dnd-kit
**When:** Project management interfaces, task tracking systems, workflow visualization
**Usage:** KanbanProvider > KanbanBoard > KanbanHeader, KanbanCards > KanbanCard

---

**Path:** `src/components/blocks/stories.tsx`
**What:** Instagram-style stories carousel with video/image support
**When:** Social media features, content highlights, promotional carousels
**Usage:** Stories > StoriesContent > Story with StoryVideo/Image, StoryAuthor, StoryTitle, StoryOverlay

---

**Path:** `src/components/logo-cloud.tsx`
**What:** Infinite scrolling logo carousel with progressive blur edges
**When:** Landing pages, client showcase sections, partner displays
**Usage:** Pre-built section component with InfiniteSlider and ProgressiveBlur

---
