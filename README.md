# PepperDash Essentials Web Config App

A powerful web-based configuration and debugging tool for PepperDash Essentials systems. This React application provides real-time system monitoring, configuration management, and troubleshooting capabilities through an intuitive web interface.

## 🚀 Quick Start

### For Users
**New to the application?** Start with the [Getting Started Tutorial](./docs/tutorials/getting-started.md) for a guided introduction.

**Need to solve a specific problem?** Check the [How-to Guides](./docs/how-to/) for step-by-step solutions.

### For Developers
**Setting up the development environment:**

```bash
# Install dependencies
npm install

# Create a .env.local file in the project root with your target processor:
# PROGRAM_HOST=https://your-processor-ip
# VITE_PROGRAM_ID=app01

# Start development server
npm run start
```

The app will be available at `http://localhost:5173/cws/debug/`.

## 📚 Documentation

This project uses the [Diataxis framework](https://diataxis.fr/) to provide you with the right information at the right time:

### 🎯 [Tutorials](./docs/tutorials/) - Learning-oriented
**"Take me by the hand and teach me"**
- [Getting Started Tutorial](./docs/tutorials/getting-started.md) - Your first steps with the web config app
- [Debug Console Tutorial](./docs/tutorials/debug-console-basics.md) - Master the debug console
- [Device Management Tutorial](./docs/tutorials/device-management-basics.md) - Device inspection and management

### 🔧 [How-to Guides](./docs/how-to/) - Problem-oriented
**"Show me how to solve this specific problem"**
- [Troubleshooting Connection Issues](./docs/how-to/troubleshoot-connection.md)
- [Filter and Search Debug Messages](./docs/how-to/filter-debug-messages.md)
- [Export and Analyze Configuration](./docs/how-to/export-configuration.md)
- [Monitor System Performance](./docs/how-to/monitor-performance.md)
- [Restart and Reload Configuration](./docs/how-to/restart-reload-config.md)

### 📚 [Reference](./docs/reference/) - Information-oriented
**"Tell me the facts"**
- [UI Components Reference](./docs/reference/ui-components.md) - Complete component documentation
- [API Endpoints Reference](./docs/reference/api-endpoints.md) - All available REST endpoints
- [Configuration Schema Reference](./docs/reference/configuration-schema.md) - Configuration file structure
- [Device Types Reference](./docs/reference/device-types.md) - Supported device types and properties
- [Log Levels and Filters Reference](./docs/reference/log-levels.md) - Complete logging reference

### 💡 [Explanation](./docs/explanation/) - Understanding-oriented
**"Help me understand why and how this works"**
- [System Architecture](./docs/explanation/architecture.md) - How the web app integrates with Essentials
- [Debug Console Design](./docs/explanation/debug-console-design.md) - How real-time debugging works
- [Configuration Management](./docs/explanation/configuration-management.md) - How configuration is handled
- [Security Considerations](./docs/explanation/security.md) - Security model and best practices

## ✨ Key Features

- **🔍 Real-Time Debug Console**: Monitor system behavior with live message streaming
- **⚙️ Device Management**: Inspect and understand configured devices
- **📄 Configuration Viewer**: View and analyze complete system configuration
- **📦 Version Information**: Check loaded assemblies and software versions
- **🏷️ Type Registry**: Browse supported device types and capabilities
- **🔄 System Control**: Restart system and reload configuration safely

## 🛠️ Development

### Available Scripts

#### `npm start`
Runs the app in development mode via Vite. The page will reload when you make edits. Available at `http://localhost:5173/cws/debug/`.

#### `npm test`
Launches the Vitest test runner in interactive watch mode.

#### `npm run build`
Compiles TypeScript and builds the app for production to the `dist/` folder with optimized bundles.

#### `npm run preview`
Serves the production build locally for inspection before deployment.

### Environment Setup

Create a `.env.local` file in the project root (never commit this file):

```dotenv
PROGRAM_HOST=https://your-processor-ip    # Required: Target processor IP
VITE_PROGRAM_ID=app01                     # Optional: Default application slot
```

**Development Prerequisites:**
- Node.js 18+
- npm
- Network access to target PepperDash Essentials processor
- Modern web browser

### Architecture Overview

**Frontend Stack:**
- React 19 with TypeScript
- Redux Toolkit for state management (including WebSocket middleware)
- React Router v7 for navigation
- Bootstrap 5 for UI components
- WebSocket for real-time communication

**Integration:**
- Connects to PepperDash Essentials processors via HTTPS API at `/cws/<appId>/api/`
- Uses WebSocket for real-time debug message streaming
- In development, Vite proxies all `/cws/` API requests to `PROGRAM_HOST`
- In production, served as static files from the processor's built-in web server at `/cws/debug/`

## 🔐 Security Considerations

- **HTTPS Required**: All communication encrypted
- **Self-Signed Certificates**: Common for internal network devices; must be accepted in the browser before use
- **Processor Authentication**: Leverages processor's built-in security
- **Network-Level Security**: Relies on internal network protection

## 🌐 Browser Compatibility

**Supported Browsers:**
- Chrome 70+
- Firefox 65+
- Safari 12+
- Edge 79+

**Required Features:**
- WebSocket support for real-time debugging
- Modern JavaScript (ES6+) support
- CSS Grid and Flexbox for responsive layouts

## 📖 Learning Resources

**New Users:**
1. Start with [Getting Started Tutorial](./docs/tutorials/getting-started.md)
2. Learn [Debug Console Basics](./docs/tutorials/debug-console-basics.md)
3. Explore [Device Management](./docs/tutorials/device-management-basics.md)

**Troubleshooting:**
- Check [How-to Guides](./docs/how-to/) for specific solutions
- Review [Connection Troubleshooting](./docs/how-to/troubleshoot-connection.md) for access issues
- Use [Performance Monitoring](./docs/how-to/monitor-performance.md) for system health

**Advanced Usage:**  
- Understand [System Architecture](./docs/explanation/architecture.md)
- Learn [Debug Console Design](./docs/explanation/debug-console-design.md)
- Reference [API Documentation](./docs/reference/api-endpoints.md)

## 🤝 Contributing

This project follows standard React development practices:
- TypeScript for type safety
- ESLint and Prettier for code formatting
- Component-based architecture with feature organization
- Redux Toolkit for predictable state management

## 📄 License

MIT License - see [LICENSE](./LICENSE) file for details.

## 🆘 Support

**For Application Issues:**
- Check the [How-to Guides](./docs/how-to/) for common solutions
- Review system requirements and browser compatibility
- Verify network connectivity to target processor

**For PepperDash Essentials Questions:**
- Consult PepperDash documentation and support resources
- Verify Essentials framework version compatibility
- Check processor configuration and network settings

---

*Built with ❤️ for the PepperDash community. This web application makes PepperDash Essentials systems more accessible and manageable through modern web interfaces.*
