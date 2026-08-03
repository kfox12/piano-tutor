# UI Redesign Specification

Redesign the Piano Tutor application with a modern, premium interface inspired by Apple, Arc Browser, and Linear.  The application should feel like a polished productivity application built specifically for learning piano.  Prioritize simplicity, professionalism, and clean visual hierarchy over decorative elements.

### Overall Design Language

* Modern, minimal design with Apple’s attention to whitespace and typography.
* Premium, professional aesthetic with subtle inspiration from modern music software.
* Rounded corners throughout the interface (Apple-style).
* Blue should serve as the primary accent color and be used prominently throughout the application.
* Support both light mode and dark mode with a theme toggle.
* Use smooth, subtle transitions for hover effects, page changes, and state updates.  Avoid flashy animations.
* Use clean icons alongside text where appropriate.

### Layout

After the user selects a mode, use a top navigation bar for navigating between the application’s primary views.  For example, if the user selects practice mode and then wants to go home, they would navigate there using the top bar.  

Navigation items should include:

* Home
* Import Song
* Song Library
* Practice Mode
* Test Mode

The interface should use moderate spacing.  Avoid clutter by exposing only the controls needed for the current task, while allowing generous whitespace where appropriate.

Most pages should use a continuous background rather than dividing the interface into numerous panels or cards.

### Home Page

The landing page should present:

## Piano Tutor

Below the title, display a dashboard consisting of three large rounded cards.

Cards:

1. Import New Song
2. Continue Practicing
3. Test Practice

Each card should contain:

* A clean icon
* A concise title
* A short one-line description

When the user hovers over a card:

* Slightly elevate the card
* Smoothly brighten the background
* Display additional explanatory text describing what that mode does
* Keep the interaction subtle and polished

### Song Library

Downloaded songs should appear as a vertically scrolling list.

Each song should appear as a large clickable row/button rather than a small list item.

Each row should include:

* Song title
* Composer (if available)
* Last practiced date
* Optional progress indicator

Rows should have rounded corners and subtle hover animations.

### Practice Interface

The piano keyboard should not appear by default.

Only display the keyboard when the user enters a practice-related workflow, such as:

* Practice Mode
* Test Mode
* Immediately after importing a song

When displayed:

* The keyboard should occupy most of the application’s width.
* It should scale responsively with window size.
* It should remain visually clean and uncluttered.

Above the keyboard:

Prefer displaying:

* Upcoming notes
* Current measure (if available)

If current measure tracking is not yet implemented, displaying the upcoming notes alone is acceptable.

### Typography

Use Apple’s typography style:

* Large bold page titles
* Clear section headings
* Highly readable body text
* Consistent spacing between typography levels

Typography should establish a strong visual hierarchy without excessive font variation.

### Color Palette

Primary colors:

* Blue as the primary accent
* Neutral whites/grays in light mode
* Neutral dark grays in dark mode

Blue should consistently highlight:

* Active navigation items
* Buttons
* Selected songs
* Interactive controls
* Focus states

### Component Style

Buttons:

* Rounded Apple-style corners
* Consistent sizing
* Subtle shadows only where appropriate

Cards:

* Rounded
* Soft shadows
* Hover elevation
* Smooth transitions

Lists:

* Clean
* Spacious
* Easy to scan

Avoid excessive borders.  Use spacing, typography, and subtle contrast to define structure.

### sUser Experience Principles

* Keep the interface simple.
* Never overwhelm the user with unnecessary controls.
* Show only the functionality relevant to the current task.
* Prioritize clarity over visual complexity.
* Every interaction should feel smooth and polished.
* Maintain consistent spacing, alignment, and component sizing across all pages.
* Design responsively so the interface scales naturally with different window sizes.

Overall Goal

The application should feel like a high-quality desktop application that combines the simplicity of Apple, the polish of Arc Browser, and the professionalism of Linear, while remaining focused on helping users learn piano efficiently.