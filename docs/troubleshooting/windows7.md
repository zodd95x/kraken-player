# Windows 7 compatibility

Kraken Player is built on Electron, so Windows 7 support has limits.

## System requirements

::: warning Important
Since Electron 23, Windows 7/8/8.1 are officially unsupported. The Electron version used by Kraken Player may no longer run on these systems.
:::

**Recommended system**: Windows 10 version 1903 or newer

## Common problems

### App won't start

**Symptom**: double-clicking does nothing, or a missing system component error

**Causes**:

- Missing system updates
- Incompatible Electron version

**Fixes**:

1. Install all available Windows updates
2. Install these required components:
   - [.NET Framework 4.7.2](https://dotnet.microsoft.com/download/dotnet-framework/net472)
   - [Visual C++ Redistributable 2015-2022](https://aka.ms/vs/17/release/vc_redist.x64.exe)

### Missing API function

**Symptom**: "The procedure entry point xxx could not be located"

**Cause**: Windows 7 lacks some modern API functions

**Fixes**:

1. Make sure SP1 (Service Pack 1) is installed
2. Install the KB2533623 update
3. Install the KB3063858 update

### Missing media features

**Symptom**: SMTC media controls unavailable

**Note**: Windows 7 doesn't support SMTC (System Media Transport Controls) — a Windows 10 feature.

### SSL/TLS connection problems

**Symptom**: cannot reach the API server, network requests fail

**Cause**: Windows 7 doesn't support TLS 1.2 by default

**Fixes**:

1. Install the KB3140245 update
2. Apply this registry change (as administrator):

```reg
Windows Registry Editor Version 5.00

[HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\SecurityProviders\SCHANNEL\Protocols\TLS 1.2\Client]
"DisabledByDefault"=dword:00000000
"Enabled"=dword:00000001

[HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\SecurityProviders\SCHANNEL\Protocols\TLS 1.2\Server]
"DisabledByDefault"=dword:00000000
"Enabled"=dword:00000001
```

## Compatibility mode

If problems persist, try compatibility mode:

1. Right-click KrakenPlayer.exe
2. Choose **Properties**
3. Open the **Compatibility** tab
4. Check **Run this program in compatibility mode**
5. Select **Windows 8**

## Older releases

If the new version won't run on Windows 7, try an older release:

1. Get an older build from this repo's Releases page
2. Look for a release using Electron 22 or earlier
3. Download its installer

::: warning Security warning
Old versions may have known security holes — upgrade to Windows 10 or newer as soon as you can.
:::

## Upgrade advice

Windows 7 reached end of life in January 2020 — upgrading to Windows 10/11 is strongly recommended:

1. **Security**: Windows 7 gets no more security updates
2. **Compatibility**: more and more apps drop Windows 7
3. **Performance**: newer systems are usually better optimized
4. **Features**: unlocks modern features like SMTC

## Related links

- [Windows 7 end-of-life notes](https://learn.microsoft.com/lifecycle/products/windows-7)
- [Electron system requirements](https://www.electronjs.org/docs/latest/tutorial/support#windows)
