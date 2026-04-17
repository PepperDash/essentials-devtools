# PepperDash Essentials Web Config App Documentation

Welcome to the comprehensive documentation for the PepperDash Essentials Web Config App - a powerful web-based tool for configuring, debugging, and managing PepperDash Essentials systems.

## Documentation Structure

This documentation follows the [Diataxis framework](https://diataxis.fr/) to provide you with the right information at the right time:

### 🎯 [Tutorials](./tutorials/) - Learning-oriented
**"Take me by the hand and teach me"**

Step-by-step guides that take you through your first experiences with the application. Perfect for newcomers who want to get started quickly.

- **[Getting Started Tutorial](./tutorials/getting-started.md)** - Your first steps with the web config app
- **[Debug Console Tutorial](./tutorials/debug-console-basics.md)** - Learn to use the debug console effectively
- **[Device Management Tutorial](./tutorials/device-management-basics.md)** - Basic device inspection and management

### 🔧 [How-to Guides](./how-to/) - Problem-oriented
**"Show me how to solve this specific problem"**

Practical guides that solve specific problems you might encounter. These assume you have basic familiarity with the system.

- **[Troubleshooting Connection Issues](./how-to/troubleshoot-connection.md)**
- **[Filter and Search Debug Messages](./how-to/filter-debug-messages.md)**
- **[Export and Analyze Configuration](./how-to/export-configuration.md)**
- **[Monitor System Performance](./how-to/monitor-performance.md)**
- **[Restart and Reload Configuration](./how-to/restart-reload-config.md)**

### 📚 [Reference](./reference/) - Information-oriented
**"Tell me the facts"**

Complete technical information about all features, APIs, and components. Organized for easy lookup.

- **[UI Components Reference](./reference/ui-components.md)** - Complete component documentation
- **[API Endpoints](./reference/api-endpoints.md)** - All available REST endpoints
- **[Configuration Schema](./reference/configuration-schema.md)** - Configuration file structure
- **[Device Types](./reference/device-types.md)** - Supported device types and properties
- **[Log Levels and Filters](./reference/log-levels.md)** - Complete logging reference

### 💡 [Explanation](./explanation/) - Understanding-oriented
**"Help me understand why and how this works"**

Background information and design decisions that help you understand the system's architecture and concepts.

- **[System Architecture](./explanation/architecture.md)** - How the web app integrates with Essentials
- **[Debug Console Design](./explanation/debug-console-design.md)** - How real-time debugging works
- **[Configuration Management](./explanation/configuration-management.md)** - How configuration is handled
- **[Security Considerations](./explanation/security.md)** - Security model and best practices

## Quick Start

If you're new to the application, start with the **[Getting Started Tutorial](./tutorials/getting-started.md)**.

If you need to solve a specific problem, check the **[How-to Guides](./how-to/)**.

For detailed technical information, consult the **[Reference](./reference/)** section.

To understand the underlying concepts, read the **[Explanation](./explanation/)** articles.

## Application Overview

The PepperDash Essentials Web Config App provides several key features:

- **� Authentication**: Secure login required before accessing any app data
- **🔍 Debug Console**: Real-time log monitoring with per-device minimum log level filtering
- **⚙️ Device Management**: Inspect and interact with connected devices
- **📄 Configuration Viewer**: View and analyze merged configuration files
- **📦 Version Information**: Check loaded assemblies and versions
- **🔀 Routing**: Visual signal routing diagram between devices and tie lines
- **📱 Mobile Control**: Mobile control interface management
- **🗺️ API Paths**: Browse all available REST API routes on the processor
- **🏷️ Type Registry**: Browse supported device types and their properties

## Multi-Application Support

The app supports up to 10 simultaneous PepperDash Essentials program slots (`app01` through `app10`). After logging in, available program slots are automatically discovered and populated in the application selector dropdown in the top navigation bar. Navigating between app slots does not require re-authentication.

## System Requirements

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Network access to your PepperDash Essentials processor
- PepperDash Essentials framework running on target device

## Support

For technical support and questions:
- Check the [How-to Guides](./how-to/) for common solutions
- Review the [Reference](./reference/) documentation for technical details
- Consult the [Explanation](./explanation/) articles for deeper understanding

---

*This documentation is organized using the [Diataxis framework](https://diataxis.fr/) to ensure you get the right type of information for your needs.*
