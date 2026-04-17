# System Architecture

**Understanding how the PepperDash Essentials Web Config App integrates with and complements the broader PepperDash Essentials ecosystem.**

This article explains the architectural design, system relationships, and technical decisions that shape how the web configuration application works within the larger PepperDash framework.

## Overall System Context

### The PepperDash Essentials Framework

**PepperDash Essentials** is a comprehensive framework for building control systems that manage audio-visual equipment, lighting, HVAC, and other building automation devices. The web config app is one component in a larger ecosystem:

```
┌─────────────────────────────────────────────────────────────┐
│                    PepperDash Essentials System             │
├─────────────────────────────────────────────────────────────┤
│  Control Processor (Crestron 3-Series, 4-Series, VC-4)    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   Essentials    │  │   Device        │  │   User       │ │
│  │   Framework     │◄─┤   Drivers       │◄─┤  Interfaces  │ │
│  │                 │  │                 │  │              │ │
│  └─────────┬───────┘  └─────────────────┘  └──────────────┘ │
│            │                                                │
│            ▼                                                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   Web Config    │  │   Mobile Apps   │  │   External   │ │
│  │   App (This)    │  │   Touch Panels  │  │   APIs       │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Role of the Web Config App

The web application serves several specific roles within this ecosystem:

**Configuration Management**:
- Provides read-only access to the merged system configuration
- Allows visualization of complex configuration relationships
- Enables configuration backup and documentation

**Real-Time Monitoring**:
- Offers live insight into system operations through debug messages
- Enables filtering and analysis of system behavior
- Provides troubleshooting capabilities for system administrators

**System Control** (Limited):
- Allows system restart and configuration reloading
- Provides control over debug logging levels
- Enables controlled system maintenance operations

**Development Support**:
- Assists in system development and debugging
- Provides detailed insight into device communications
- Enables testing and validation of system configurations

## Architectural Layers

### Presentation Layer (React Frontend)

**Technology Stack**:
- **React 18**: Component-based UI framework
- **TypeScript**: Type-safe development
- **Bootstrap 5**: Responsive design framework
- **React Router**: Client-side routing
- **Redux Toolkit**: State management

**Key Design Decisions**:

**Single Page Application (SPA)**:
- Eliminates page refreshes for better user experience
- Maintains WebSocket connections across navigation
- Provides responsive interface suitable for various devices

**Component-Based Architecture**:
- Reusable UI components for consistent interface
- Separation of concerns between display and logic
- Maintainable codebase with clear component boundaries

**State Management Strategy**:
- **RTK Query**: Server state management and caching
- **Redux Toolkit**: Client state management for authentication, debug console filters, and UI state
  - `auth` slice: global authentication state and available app slot list
  - `debugConsole` slice: per-device minimum log level, checked device filters, and search text
  - `websocket` slice: WebSocket connection state and received log messages
  - `commonUi` slice: shared UI state such as the active room ID
- **Local component state**: Transient UI state such as modals, drawer open/close, and form inputs
- Filter state lives in Redux (not URL parameters) so selections are preserved when navigating between routes

### API Layer (RESTful Services)

**Integration Pattern**:
The web app communicates with the processor through a RESTful API that exposes specific functionality from the Essentials framework:

```
Web Browser ──HTTPS──► Control Processor
     │                        │
     │                        ▼
     │               ┌─────────────────┐
     │               │   Web Server    │
     │               │   (Built-in)    │
     │               └─────────┬───────┘
     │                        │
     │                        ▼
     │               ┌─────────────────┐
     │               │   API Layer     │
     │               │   (/cws/app01/) │
     │               └─────────┬───────┘
     │                        │
     │                        ▼
     │               ┌─────────────────┐
     └──WebSocket────┤   Essentials    │
                     │   Framework     │
                     └─────────────────┘
```

**API Design Principles**:

**RESTful Endpoints**: 
- Standard HTTP methods (GET for retrieval, POST for actions)
- Resource-based URLs that map to system concepts
- Consistent response formats across all endpoints

**Minimal Surface Area**:
- Exposes only necessary functionality to the web interface
- Maintains security by limiting available operations
- Reduces complexity by focusing on specific use cases

**Real-Time Capability**:
- WebSocket connection for live debug message streaming
- Bidirectional communication potential (currently read-only)
- Efficient handling of high-volume message streams

### Data Layer (Essentials Framework)

**Framework Integration**:
The API layer acts as a bridge between the web interface and the core Essentials framework:

**Configuration Access**:
- Reads merged configuration from the framework's configuration system
- Provides access to both static configuration and runtime state
- Maintains consistency with the framework's configuration model

**Device Management**:
- Accesses the framework's device registry for device information
- Provides device property and method information
- Maintains synchronization with actual device states

**Logging Integration**:
- Taps into the framework's structured logging system
- Provides real-time access to log messages as they're generated
- Supports filtering and level control through the logging framework

## Communication Patterns

### HTTP-Based Operations

**Request-Response Pattern**:
Most operations use standard HTTP request-response patterns:

1. **Client Request**: Web app sends HTTP request to processor
2. **Framework Query**: API layer queries Essentials framework
3. **Response Generation**: Framework data transformed to JSON response
4. **Client Processing**: Web app processes response and updates UI

**Caching Strategy**:
- **Static Data**: Versions, device types cached in browser
- **Dynamic Data**: Device lists, configurations fetched on demand
- **Real-Time Data**: Debug messages streamed, not cached

### WebSocket-Based Streaming

**Real-Time Debug Messages**:
The debug console uses WebSocket communication for real-time message streaming:

```
1. Client requests debug session via HTTP
2. Server provides WebSocket URL
3. Client establishes WebSocket connection
4. Server streams messages as they occur
5. Client processes and displays messages in real-time
```

**Message Flow Architecture**:
```
Framework Logging ──► Message Buffer ──► WebSocket ──► Client Browser
                             │
                             ▼
                        Filter by Level
                        Format as JSON
                        Rate Limiting
```

**Performance Considerations**:
- **Message Buffering**: Framework buffers messages to handle bursts
- **Rate Limiting**: Prevents overwhelming slow clients
- **Connection Management**: Handles client disconnections gracefully

## Security Architecture

### Authentication Model

**Application-Level Authentication**:
The web app implements its own credential-based authentication flow on top of the processor's built-in security:

- **Login Form**: Users provide a username and password before accessing any app data
- **Credential Validation**: Credentials are submitted to the processor via `POST /:appId/api/loginCredentials`
- **Server-Side Single Auth**: The backend has one shared authentication mechanism regardless of which `appId` is used in the request
- **Global Session**: A successful login with any app slot authenticates the session for all running app slots
- **Redux Auth State**: `isAuthenticated` boolean and `availableApps` list are stored in Redux in-memory (resets on page reload)
- **Route Protection**: A `RequireAuth` layout route wraps all `/:appId/*` sub-routes; unauthenticated requests are redirected to `/:appId/login`

**App Slot Discovery**:
After credentials are validated, the application probes all 10 possible slots (`app01`–`app10`) in parallel using `Promise.allSettled`. Slots that respond successfully are stored as `availableApps` and populate the app selector dropdown in the top navigation bar.

**No Independent Authentication**: Web app doesn't implement its own persistent user system
- **Processor Integration**: Uses whatever authentication the processor has configured
- **Session Management**: Relies on processor's session handling

**Security Boundaries**:
```
Internet ──[Firewall]──► Internal Network ──[HTTPS]──► Processor Web Server
                                                            │
                                                            ▼
                                                       Web Config App
```

### Data Protection

**In-Transit Security**:
- **HTTPS Required**: All communication encrypted with TLS
- **Certificate Handling**: Self-signed certificates common for internal devices
- **WebSocket Security**: WSS (secure WebSocket) for debug messages

**Data Sensitivity**:
- **Configuration Data**: May contain IP addresses, device information
- **Debug Messages**: May contain operational details and error information
- **No User Data**: Application doesn't store personal or credential information

## Scalability and Performance

### Browser Performance

**Client-Side Optimization**:
```
Message Volume ──► Client Filtering ──► DOM Updates ──► Display
      │                    │                │
      ▼                    ▼                ▼
Rate Limiting         Debounced UI      Virtual Scrolling
Message Buffers       State Updates     (Future Enhancement)
```

**Performance Characteristics**:
- **Message Processing**: Can handle 100+ messages per second
- **Memory Management**: Messages accumulate in browser memory
- **UI Responsiveness**: Maintained through efficient React updates

### Server-Side Performance

**Framework Integration Impact**:
- **Minimal Framework Load**: Web API designed for minimal impact
- **Debug Session Overhead**: Each active session consumes resources
- **Multiple Client Support**: Framework can support several concurrent web sessions

**Resource Management**:
- **Connection Limits**: Framework may limit concurrent debug sessions
- **Memory Usage**: Message buffering uses framework memory
- **CPU Impact**: Minimal when not actively debugging

## Development Architecture

### Code Organization

**Frontend Structure**:
```
src/
├── features/          # Feature-based organization
│   ├── DebugConsole/  # Debug-related components
│   ├── DeviceList/    # Device management
│   └── ConfigFile/    # Configuration display
├── shared/            # Reusable components
├── store/             # State management
└── services/          # API communication
```

**Design Patterns**:
- **Feature-Based Organization**: Related components grouped together
- **Shared Components**: Reusable UI elements across features
- **Service Layer**: Abstracted API communication
- **State Management**: Centralized with RTK Query

### Build and Deployment

**Build Process**:
1. **TypeScript Compilation**: Type checking and compilation
2. **Bundling**: Webpack bundles for browser delivery
3. **Asset Optimization**: Minification and compression
4. **Static File Generation**: Ready for web server deployment

**Deployment Model**:
- **Static Files**: Compiled to static HTML, CSS, JavaScript
- **Processor Hosting**: Files served by processor's web server
- **No Server Requirements**: Pure client-side application

## Integration Points

### Essentials Framework Integration

**Framework APIs Used**:
- **Device Manager**: For device information and control
- **Configuration System**: For configuration access and management
- **Logging Framework**: For debug message access
- **System Control**: For restart and reload operations

**Framework Dependencies**:
- **Version Compatibility**: Requires specific Essentials framework versions
- **API Stability**: Depends on framework API consistency
- **Feature Availability**: Some features require specific framework capabilities

### Future Integration Possibilities

**Enhanced Device Control**:
- Direct device method execution from web interface
- Real-time device property monitoring
- Device configuration modification capabilities

**Extended System Management**:
- Configuration file editing and validation
- System performance monitoring and analytics
- Remote system updates and maintenance

**Multi-System Support**:
- Management of multiple processors from single interface
- System comparison and synchronization capabilities
- Centralized monitoring for multiple installations

## Design Philosophy

### User-Centered Design

**Progressive Disclosure**:
- Start with simple, common operations
- Provide access to advanced features when needed
- Maintain clear information hierarchy

**Real-Time Feedback**:
- Immediate visual feedback for all actions
- Real-time data updates where possible
- Clear indication of system state and changes

### Technical Excellence

**Maintainability**:
- Clear separation of concerns
- Consistent coding patterns and standards
- Comprehensive type safety with TypeScript

**Reliability**:
- Graceful handling of network issues
- Robust error handling and recovery
- Consistent behavior across different environments

**Performance**:
- Efficient rendering and state management
- Minimal impact on processor resources
- Responsive interface under various load conditions

The architectural design reflects a balance between powerful functionality and practical constraints, providing essential tools for system management while maintaining integration with the broader PepperDash ecosystem.
