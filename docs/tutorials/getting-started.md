# Getting Started with the Essentials Web Config App

**Learning objective**: By the end of this tutorial, you'll understand how to access the web app, sign in, navigate its interface, and perform basic debugging tasks.

**Time required**: 15-20 minutes

**Prerequisites**: 
- Access to a PepperDash Essentials processor on your network
- Valid credentials for the processor
- Basic understanding of network connectivity

## What You'll Learn

- How to access the web application and sign in
- How to navigate the main interface and switch between app slots
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

✅ **Success indicator**: You should see a Sign In page.

## Step 2: Signing In

1. **Enter your credentials**
   - Type your username and password
   - Click **Sign In**

2. **What happens during sign-in**
   - Your credentials are sent to the processor to validate them
   - If valid, the app automatically discovers which program slots are running (up to 10)
   - You are redirected to the first available app slot

3. **Application selector**
   - The top navigation bar will show a dropdown with available program slots (e.g. `app01`, `app02`)
   - Use this to switch between independently running Essentials instances
   - Switching slots does not require re-authentication

✅ **Success indicator**: You are viewing a page like `/:appId/versions`.

## Step 3: Exploring the Interface

The application has several main sections accessible from the top navigation:

### Versions
- Lists all loaded software assemblies and their versions
- Useful for verifying what software is running

### API Paths
- Shows all REST API routes available on the processor
- Click a route row to see its full URL and details

### Initialization Exceptions
- Only visible when PepperDashEssentials.dll ≥ 3.0
- Lists any exceptions from system startup

### Debug Console
- Real-time log messages from your system
- The most powerful feature for troubleshooting

### Config File
- Shows the complete merged configuration
- Displays the JSON structure of your system setup

### Devices
- Lists all configured devices in your system
- Allows inspection of device properties and methods

### Types
- Shows all supported device types
- Useful for understanding what devices can be configured

### Routing
- Visual diagram of signal routing between devices and tie lines, color-coded by signal type
- Click a tie line, device, or multiview tile to trace and highlight its full signal path
- Shows live current-source feedback on systems running PepperDashEssentials.dll 3.0+

### Mobile Control
- Management interface for connected mobile control clients

**Try this**: Click through each navigation item to see the different sections.

## Step 4: Viewing System Information

Let’s start by checking what’s running on your system:

1. **Click "Versions"**
   - You’ll see a list of all loaded software components, sorted alphabetically
   - Look for "PepperDashEssentials.dll" to confirm the framework version

2. **Click "Types"**
   - Browse the available device types
   - Common types include `basicTriList`, `panasonicDisplay`, `samsungMDC`

3. **Click "Devices"**
   - See all configured devices in your system
   - Each device has a Key (unique identifier) and Name (friendly name)

✅ **Success indicator**: You can see version information, available types, and configured devices.

## Step 5: Starting Your First Debug Session

The Debug Console is the heart of the application for troubleshooting:

1. **Navigate to "Debug Console"**
   - Click "Debug Console" in the top navigation

2. **Start a debug session**
   - Click the blue **Start Debug Session** button
   - You should see "Message Count: 0" initially

3. **Generate some activity**
   - If possible, interact with your system (press buttons, change inputs, etc.)
   - Watch as messages appear in real-time

4. **Observe the message structure**
   - **Timestamp**: When the message occurred
   - **Key**: Which device generated the message (`global` for system messages)
   - **Level**: Importance level (Information, Warning, Error, etc.)
   - **Message**: The actual log message

✅ **Success indicator**: You can see real-time log messages appearing in the console.

## Step 6: Basic Message Filtering

Let’s learn to filter messages:

1. **Filter by device with a minimum level**
   - Click the **Devices** dropdown
   - Check one or more devices
   - Each checked device shows an inline level dropdown (defaults to `Information`)
   - Change a device’s level to `Warning` to hide its lower-severity messages

2. **Use the search box**
   - Type a keyword (like `button` or `display`) in the search field
   - Results filter immediately

3. **Clear filters**
   - Click **Clear Filters** to reset the device selections and search text
   - Filter selections are saved in memory — navigating to another page and returning preserves them

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
