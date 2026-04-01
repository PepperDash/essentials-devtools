# How to Troubleshoot Connection Issues

**Problem**: You can't access the web application or it's not loading properly.

**When to use this guide**: When you're having trouble connecting to or loading the Essentials Web Config App.

## Quick Diagnosis

Try these quick checks first:

1. **Can you ping the processor?** `ping [processor-ip]`
2. **Is the URL correct?** Should be `https://[processor-ip]/debug/`
3. **Does the processor respond on any port?** Try `https://[processor-ip]` (may show different content)

## Step-by-Step Troubleshooting

### 1. Verify Basic Network Connectivity

**Check network connectivity:**
```bash
ping [processor-ip]
```
- ✅ **Success**: You get replies → Network connectivity is working
- ❌ **Failure**: Request timeout or unreachable → Network issue

**If ping fails:**
- Verify you're on the same network/VLAN as the processor
- Check your IP configuration and subnet mask
- Confirm the processor IP address is correct
- Test with a different device on the same network

### 2. Verify the Web Service is Running

**Test HTTPS connectivity:**
```bash
telnet [processor-ip] 443
```
Or try the base URL in your browser: `https://[processor-ip]`

**Expected results:**
- ✅ **Connection successful**: Port 443 is open and accepting connections
- ❌ **Connection refused**: Web service may not be running
- ❌ **Timeout**: Firewall blocking or service not responding

### 3. Check Browser-Specific Issues

**Try a different browser:**
- Chrome, Firefox, Safari, or Edge
- Use incognito/private mode to avoid cache issues

**Clear browser data:**
1. Clear cookies and cache for the processor's IP
2. Disable browser extensions temporarily
3. Check if popup blockers are interfering

### 4. Handle Certificate Issues

**Common certificate warnings:**
- "Your connection is not private"
- "NET::ERR_CERT_AUTHORITY_INVALID"
- "This site can't provide a secure connection"

**How to proceed safely:**
1. Click "Advanced" or "Show details"
2. Click "Proceed to [IP] (unsafe)" or "Accept the risk"
3. This is safe on your internal network

**Note**: These warnings are normal for internal devices with self-signed certificates.

### 5. Verify Correct URL Format

**Correct URL format:**
```
https://[processor-ip]/debug/
```

**Common mistakes:**
- ❌ `http://` instead of `https://`
- ❌ Missing `/debug/` path
- ❌ Wrong IP address
- ❌ Extra characters or typos

**Examples of correct URLs:**
- `https://192.168.1.100/debug/`
- `https://10.0.0.50/debug/`
- `https://processor.local/debug/` (if DNS is configured)

### 6. Check Processor Status

**Physical indicators:**
- Power LED should be solid (not blinking)
- Network LED should show activity
- Any error displays on the processor

**If processor seems unresponsive:**
- Try power cycling (unplug for 30 seconds, reconnect)
- Check for overheating or physical damage
- Verify all network cables are secure

### 7. Test from Different Locations

**Try connecting from:**
- Different computer on same network
- Different network location (if processor accessible)
- Mobile device on same WiFi network

**This helps identify:**
- Whether the issue is device-specific
- Network routing problems
- Firewall or access control issues

## Common Error Messages and Solutions

### "This site can't be reached"
**Cause**: Network connectivity issue
**Solution**: Check network configuration, IP address, and physical connections

### "Your connection is not private" / "Certificate error"
**Cause**: Self-signed certificate (normal for internal devices)
**Solution**: Click "Advanced" → "Proceed to [IP] (unsafe)"

### "404 Not Found"
**Cause**: Wrong URL path
**Solution**: Ensure URL ends with `/debug/` (include the trailing slash)

### "500 Internal Server Error"
**Cause**: Web service error on processor
**Solution**: Try power cycling the processor, check processor logs

### "Connection timed out"
**Cause**: Firewall blocking connection or service not running
**Solution**: Check firewall rules, verify processor is running properly

### Page loads but shows "Loading..." indefinitely  
**Cause**: JavaScript errors or API connectivity issues
**Solution**: Check browser console for errors, try different browser

## Advanced Troubleshooting

### Check Browser Developer Tools

1. **Open Developer Tools** (F12 in most browsers)
2. **Go to Console tab**
3. **Look for error messages** (usually in red)
4. **Check Network tab** for failed requests

**Common console errors:**
- CORS errors: May indicate proxy configuration issues
- Network errors: API endpoints not responding
- JavaScript errors: Browser compatibility issues

### Verify Environment Variables

If you have access to the development setup:

**Check required environment variables:**
```bash
# Should be set to processor IP
echo $PROGRAM_HOST

# Should be set to application slot (usually app01)
echo $PROGRAM_ID
```

### Test API Endpoints Directly

Try accessing API endpoints directly:
```
https://[processor-ip]/cws/app01/api/versions
```

Should return JSON data if the API is working.

## Network Configuration Issues

### Subnet and VLAN Issues
- Ensure your device and processor are on the same network segment
- Check VLAN configuration if using managed switches
- Verify subnet masks allow communication

### Firewall and Security
- Corporate firewalls may block HTTPS to internal devices
- Some networks block self-signed certificates
- Guest networks may restrict device-to-device communication

### DNS Resolution
- If using hostnames instead of IP addresses
- Check DNS configuration and host entries
- Try IP address directly to bypass DNS issues

## Prevention and Monitoring

### Regular Health Checks
- Test connectivity periodically
- Monitor processor uptime and performance
- Keep browser bookmarks updated with correct URLs

### Documentation
- Document working IP addresses and URLs
- Note any special network configuration requirements
- Keep contact information for network administrators

## When to Escalate

**Contact your network administrator if:**
- Multiple users report the same connectivity issues
- Network infrastructure changes preceded the problems
- Firewall or security policy changes are suspected

**Contact PepperDash support if:**
- Processor hardware appears to be failing
- Software updates may have caused issues
- Configuration changes are needed

## Quick Reference

### Connection Checklist
- [ ] Correct URL format: `https://[ip]/debug/`
- [ ] Network connectivity (ping works)
- [ ] HTTPS port 443 accessible
- [ ] Browser certificate warnings handled
- [ ] Processor powered on and responding
- [ ] No firewall blocking access

### URLs to Test
1. `https://[processor-ip]/debug/` - Main application
2. `https://[processor-ip]/` - Base web service
3. `https://[processor-ip]/cws/app01/api/versions` - API test

### Browser Settings
- Allow self-signed certificates for internal networks
- Disable popup blockers for the processor IP
- Clear cache/cookies if problems persist

Remember: Most connection issues are network-related rather than application problems. Work systematically from basic connectivity up to application-specific issues.
