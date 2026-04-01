# Getting Started with the Essentials Web Config App

**Learning objective**: By the end of this tutorial, you'll understand how to access the web app, navigate its interface, and perform basic debugging tasks.

**Time required**: 15-20 minutes

**Prerequisites**: 
- Access to a PepperDash Essentials processor on your network
- Basic understanding of network connectivity

## What You'll Learn

- How to access the web application
- How to navigate the main interface
- How to start a debug session
- How to view basic system information

## Step 1: Accessing the Application

1. **Find your processor's IP address**
   - Check your network configuration or processor display
   - Note the IP address (e.g., `192.168.1.100`)

2. **Open your web browser**
   - Use Chrome, Firefox, Safari, or Edge
   - Navigate to: `https://[processor-ip]/debug/`
   - Example: `https://192.168.1.100/debug/`

3. **Handle security warnings**
   - You may see a security warning about the certificate
   - Click "Advanced" and "Proceed to [IP] (unsafe)" to continue
   - This is normal for internal network devices

✅ **Success indicator**: You should see the "Essentials Debugger" interface with a navigation bar.

## Step 2: Exploring the Interface

The application has six main sections accessible from the top navigation:

### Home
- Basic welcome screen
- Starting point for navigation

### Debug Console
- Real-time log messages from your system
- The most powerful feature for troubleshooting

### Versions
- Lists all loaded software assemblies and their versions
- Useful for verifying what software is running

### Config File
- Shows the complete merged configuration
- Displays the JSON structure of your system setup

### Devices
- Lists all configured devices in your system
- Allows inspection of device properties and methods

### Types
- Shows all supported device types
- Useful for understanding what devices can be configured

**Try this**: Click through each navigation item to see the different sections.

## Step 3: Viewing System Information

Let's start by checking what's running on your system:

1. **Click "Versions"**
   - You'll see a list of all loaded software components
   - Look for "PepperDash-Essentials" to confirm the framework version

2. **Click "Types"**
   - Browse the available device types
   - Notice the three columns: Type Name, Class Type, and Description
   - Common types include "basicTriList", "panasonicDisplay", "samsungMDC"

3. **Click "Devices"**
   - See all configured devices in your system
   - Each device has a Key (unique identifier) and Name (friendly name)

✅ **Success indicator**: You can see version information, available types, and configured devices.

## Step 4: Starting Your First Debug Session

The Debug Console is the heart of the application for troubleshooting:

1. **Navigate to "Debug Console"**
   - Click "Debug Console" in the top navigation

2. **Start a debug session**
   - Click the blue "Start Debug Session" button
   - You should see "Message Count: 0" initially

3. **Generate some activity**
   - If possible, interact with your system (press buttons, change inputs, etc.)
   - Watch as messages appear in real-time

4. **Observe the message structure**
   - **Timestamp**: When the message occurred
   - **Key**: Which device generated the message ("global" for system messages)
   - **Level**: Importance level (Information, Warning, Error, etc.)
   - **Message**: The actual log message

✅ **Success indicator**: You can see real-time log messages appearing in the console.

## Step 5: Basic Message Filtering

Let's learn to filter messages to find what you need:

1. **Use the search box**
   - Type a keyword (like "button" or "display") in the search field
   - Wait 1 second for results to filter automatically

2. **Filter by device**
   - Click the "Devices" dropdown
   - Select one or more devices to filter messages
   - Notice the blue badge showing how many filters are active

3. **Filter by log level**
   - Click the "Log Level" dropdown
   - Try selecting only "Error" and "Warning" to see problems
   - This helps focus on issues that need attention

4. **Clear filters**
   - Click the "Clear" button to remove all filters
   - All messages will be visible again

✅ **Success indicator**: You can filter messages by search terms, devices, and log levels.

## Step 6: Viewing Detailed Message Information

1. **Click on any message row**
   - A detailed panel will slide out from the right side
   - This shows complete message information including properties

2. **Explore the details**
   - **Timestamp**: Exact time with milliseconds
   - **Rendered Message**: The formatted message text
   - **Message Template**: The raw template used
   - **Properties**: Additional structured data (JSON format)

3. **Close the detail panel**
   - Click the "X" in the top-right of the detail panel

✅ **Success indicator**: You can view detailed information about any log message.

## What You've Accomplished

Congratulations! You've successfully:

- ✅ Accessed the web application securely
- ✅ Navigated through all main sections
- ✅ Started a debug session and viewed real-time messages
- ✅ Applied basic filtering to find specific information
- ✅ Examined detailed message information

## Next Steps

Now that you understand the basics, you can:

- **Learn advanced debugging**: Try the [Debug Console Tutorial](./debug-console-basics.md)
- **Explore device management**: Check out [Device Management Tutorial](./device-management-basics.md)
- **Solve specific problems**: Browse the [How-to Guides](../how-to/)

## Troubleshooting

**Can't access the web app?**
- Verify the processor IP address
- Check network connectivity
- Ensure the processor is powered on and running

**No debug messages appearing?**
- Verify the debug session started successfully
- Check if your system is generating activity
- Try reloading the page and starting a new session

**Browser security warnings?**
- This is normal for internal devices with self-signed certificates
- Safe to proceed on your internal network
- Don't ignore these warnings on public networks

## Summary

The Essentials Web Config App is a powerful tool for managing and debugging your PepperDash system. The Debug Console provides real-time visibility into system behavior, while the other sections give you insight into configuration, devices, and system state.

Continue with the other tutorials to deepen your understanding of specific features!
