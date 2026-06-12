# Capability: Presentation Generation

## Purpose
TBD - Build, refine, and structure presentation outline and full slide decks using AI-powered generation models.

## Requirements

### Requirement: Nvidia Outline Generation
The system SHALL generate a structured JSON presentation outline using the Nvidia NIM API with the model `google/diffusiongemma-26b-a4b-it` when requested by the frontend.

#### Scenario: Successful outline generation
- **WHEN** the user requests a presentation outline on a topic
- **THEN** the system calls the Nvidia NIM API with model `google/diffusiongemma-26b-a4b-it` and returns a valid JSON outline containing slide titles and layouts

### Requirement: Nvidia Presentation Generation
The system SHALL expand the outline into a complete set of slide titles, bullet points, image queries, and speaker notes using the Nvidia NIM API with the model `nvidia/nemotron-3-ultra-550b-a55b`.

#### Scenario: Successful presentation generation
- **WHEN** the user approves the outline to generate full presentation slides
- **THEN** the system calls the Nvidia NIM API with model `nvidia/nemotron-3-ultra-550b-a55b` and returns a JSON payload representing the complete presentation slide deck
