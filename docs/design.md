# Design

This document describes UX/UI design principles to be used in Cadenza.

## Touch interface

The main target platform of this application is iOS and Android. It may also be built for desktop, but no extra design will be done for those platforms. Most users will use a tablet (often a large one) but some workflows will utilize a phone, at least in performance mode.

All UI design should assume a touch interface. All "click" targets should be large. No actions should require multi-touch. There should be no hover states.

## Tablet vs. Phone

The best UX is aimed at users using a tablet. Phone UX will sacrifice some slickness due to limited space, e.g. listing info rather than displaying it graphically.

## Dark mode only

Users will be performing in darkened orchestra pits. Only a dark mode theme needs to be supported.

## Accessibility (a11y)

Since users are keyboardists in musical theatre, we may assume that they have vision and high dexterity. We do not need to worry about screen readers or other assistive devices. Some users may occasionally operate Cadenza with a keyboard, so design should still be mindful of focus cycle and keyboard focus states. Color contrast and color deficiency guidelines should still be followed.
