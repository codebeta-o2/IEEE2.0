/**
 * Network Connectivity & Mobile Network Monitor Utility
 * Actively checks whether the device is truly online or offline, and accurately
 * detects whether the connection is via Mobile Network (Cellular / 4G / 5G / 3G),
 * Wi-Fi, Ethernet, or Offline.
 */

export type ConnectionType = 
  | "cellular" 
  | "wifi" 
  | "ethernet" 
  | "bluetooth" 
  | "none" 
  | "unknown";

export interface NetworkProbeResult {
  isOnline: boolean;
  isMobileNetwork: boolean; // True if using Cellular Data (Mobile Network)
  connectionType: ConnectionType;
  effectiveType?: string; // "4g", "3g", "2g", "slow-2g"
  networkLabel: string; // Human-readable network label
  isMobileDevice: boolean;
  latencyMs?: number;
  method: "navigator" | "probe" | "connection-api";
  timestamp: Date;
  carrierOrDetails?: string;
}

/**
 * Detects if the current client is a mobile device (smartphone or tablet)
 */
export function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isMobileUa = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isIpadOs = navigator.maxTouchPoints && navigator.maxTouchPoints > 1 && /Macintosh/i.test(ua);
  return Boolean(isMobileUa || isIpadOs);
}

/**
 * Accesses browser Network Information API if available
 */
function getNetworkInformation(): any {
  if (typeof navigator === "undefined") return null;
  return (
    (navigator as any).connection ||
    (navigator as any).mozConnection ||
    (navigator as any).webkitConnection ||
    null
  );
}

/**
 * Extracts connection details from the browser Network Information API
 */
export function inspectConnectionDetails(): {
  isOnline: boolean;
  isMobileNetwork: boolean;
  connectionType: ConnectionType;
  effectiveType?: string;
  networkLabel: string;
  isMobileDevice: boolean;
} {
  const isMobile = isMobileDevice();
  const rawOnline = typeof navigator !== "undefined" ? navigator.onLine : false;
  const conn = getNetworkInformation();

  if (!rawOnline) {
    return {
      isOnline: false,
      isMobileNetwork: false,
      connectionType: "none",
      networkLabel: "Offline (Airplane Mode / Data Off)",
      isMobileDevice: isMobile,
    };
  }

  // If Network Information API is available
  if (conn) {
    const rawType = String(conn.type || "").toLowerCase();
    const effType = String(conn.effectiveType || "").toLowerCase();

    // 1. Explicit Cellular Connection (Mobile Network)
    if (rawType === "cellular" || rawType === "wimax") {
      const effLabel = effType ? ` (${effType.toUpperCase()})` : "";
      return {
        isOnline: true,
        isMobileNetwork: true,
        connectionType: "cellular",
        effectiveType: effType,
        networkLabel: `Mobile Network / Cellular Data${effLabel}`,
        isMobileDevice: isMobile,
      };
    }

    // 2. Explicit Wi-Fi Connection
    if (rawType === "wifi") {
      return {
        isOnline: true,
        isMobileNetwork: false,
        connectionType: "wifi",
        effectiveType: effType,
        networkLabel: "Wi-Fi Network",
        isMobileDevice: isMobile,
      };
    }

    // 3. Explicit Ethernet Connection
    if (rawType === "ethernet") {
      return {
        isOnline: true,
        isMobileNetwork: false,
        connectionType: "ethernet",
        effectiveType: effType,
        networkLabel: "Ethernet Network (Wired)",
        isMobileDevice: isMobile,
      };
    }

    // 4. Explicit Offline / None
    if (rawType === "none") {
      return {
        isOnline: false,
        isMobileNetwork: false,
        connectionType: "none",
        networkLabel: "Offline (Disconnected)",
        isMobileDevice: isMobile,
      };
    }

    // 5. Inferred Mobile Network: If on a mobile device and connection type is unknown or cellular generation (4g/3g/2g)
    if (isMobile) {
      // In many Android/mobile browsers, rawType might be "unknown" while on cellular, but effectiveType is 4g/3g/2g
      const isLikelyCellular = effType === "4g" || effType === "3g" || effType === "2g" || effType === "slow-2g";
      return {
        isOnline: true,
        isMobileNetwork: true,
        connectionType: isLikelyCellular ? "cellular" : "unknown",
        effectiveType: effType,
        networkLabel: isLikelyCellular
          ? `Mobile Network (${effType.toUpperCase()} Active)`
          : "Mobile Device Network Active",
        isMobileDevice: isMobile,
      };
    }

    return {
      isOnline: true,
      isMobileNetwork: false,
      connectionType: "unknown",
      effectiveType: effType,
      networkLabel: effType ? `Online Network (${effType.toUpperCase()})` : "Online Network",
      isMobileDevice: isMobile,
    };
  }

  // Fallback if Network Information API is not supported (e.g. iOS Safari)
  if (isMobile) {
    return {
      isOnline: rawOnline,
      isMobileNetwork: rawOnline, // On mobile, online connection is cellular or wifi
      connectionType: rawOnline ? "cellular" : "none",
      networkLabel: rawOnline ? "Mobile Device Connected (Cellular or Wi-Fi)" : "Offline",
      isMobileDevice: true,
    };
  }

  return {
    isOnline: rawOnline,
    isMobileNetwork: false,
    connectionType: rawOnline ? "unknown" : "none",
    networkLabel: rawOnline ? "Online Network" : "Offline",
    isMobileDevice: false,
  };
}

/**
 * Actively tests whether the current device is connected to the network and checks
 * whether mobile network / cellular data is in use.
 * Robust across all hosting platforms including Vercel (static CDN & serverless),
 * Cloud Run, containerized Node/Express, and local development.
 */
export async function probeDeviceConnectivity(timeoutMs: number = 2000): Promise<NetworkProbeResult> {
  const connInfo = inspectConnectionDetails();

  // 1. Instant check: If hardware/OS reports offline (Airplane mode, Cellular & Wi-Fi switched off)
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return {
      isOnline: false,
      isMobileNetwork: false,
      connectionType: "none",
      networkLabel: "Offline (Airplane Mode / Data Off)",
      isMobileDevice: connInfo.isMobileDevice,
      method: "navigator",
      timestamp: new Date(),
    };
  }

  // 2. Active network probe to ensure the device can actually transmit packets over the wire.
  // We probe static /ping.json first (served by Vercel CDN/Vite with zero backend dependency),
  // with fallback to /api/health and the host origin.
  const startTime = performance.now();
  let reachedServer = false;
  let latencyMs = 0;
  let serverData: any = null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response | null = null;
    const probeNonce = Date.now();

    // Primary probe: Static ping (guaranteed to exist on Vercel static deployments & Express)
    try {
      response = await fetch(`/ping.json?_probe=${probeNonce}`, {
        method: "GET",
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
        signal: controller.signal,
      });
    } catch (_) {
      // If /ping.json failed or was blocked, attempt /api/health probe
      try {
        response = await fetch(`/api/health?_probe=${probeNonce}`, {
          method: "GET",
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
          },
          signal: controller.signal,
        });
      } catch (healthErr) {
        // Fallback: test origin root HEAD request
        response = await fetch(`/?_probe=${probeNonce}`, {
          method: "HEAD",
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
          },
          signal: controller.signal,
        });
      }
    }

    clearTimeout(timeoutId);
    latencyMs = Math.round(performance.now() - startTime);

    // CRITICAL VERCEL FIX:
    // Any HTTP response (200, 304, 204, 404, etc.) from the server confirms the socket
    // connected and packets traversed the internet to the hosting provider (e.g. Vercel).
    // An offline device CANNOT receive an HTTP status code from a remote host!
    if (response) {
      reachedServer = true;
      try {
        serverData = await response.json();
      } catch (_) {
        // Response was not JSON (e.g. HEAD request or plain text), which is completely fine
      }
    }
  } catch (err: any) {
    // If fetch failed due to offline socket, network error, or timeout:
    reachedServer = false;
  }

  // If network reached the remote host successfully
  if (reachedServer) {
    const isMobileNet =
      connInfo.isMobileNetwork ||
      Boolean(serverData?.isMobileDevice && connInfo.connectionType !== "wifi");

    return {
      isOnline: true,
      isMobileNetwork: isMobileNet,
      connectionType: connInfo.connectionType,
      effectiveType: connInfo.effectiveType,
      networkLabel: isMobileNet
        ? connInfo.networkLabel.includes("Mobile")
          ? connInfo.networkLabel
          : "Mobile Network / Cellular Data Active"
        : connInfo.networkLabel || "Internet Connected",
      isMobileDevice: connInfo.isMobileDevice || Boolean(serverData?.isMobileDevice),
      latencyMs,
      method: "probe",
      timestamp: new Date(),
      carrierOrDetails: serverData?.clientIp ? `IP: ${serverData.clientIp}` : undefined,
    };
  }

  // If probe could not reach any server endpoint:
  // Check if navigator still reports online (e.g. connected to Wi-Fi router with no internet access)
  const isNavigatorOnline = typeof navigator !== "undefined" && navigator.onLine === true;

  if (isNavigatorOnline) {
    // Device adapter is connected but no external packets can reach host
    return {
      isOnline: false,
      isMobileNetwork: connInfo.isMobileNetwork,
      connectionType: connInfo.connectionType,
      effectiveType: connInfo.effectiveType,
      networkLabel: "No Internet Access (Adapter Connected)",
      isMobileDevice: connInfo.isMobileDevice,
      method: "probe",
      timestamp: new Date(),
    };
  }

  // Truly offline
  return {
    isOnline: false,
    isMobileNetwork: false,
    connectionType: "none",
    networkLabel: "Offline (Network Disconnected)",
    isMobileDevice: connInfo.isMobileDevice,
    method: "probe",
    timestamp: new Date(),
  };
}

/**
 * Subscribes to all browser network change triggers:
 * - window "online" / "offline"
 * - document "visibilitychange"
 * - navigator.connection "change" (Crucial for detecting mobile data on/off switches)
 */
export function subscribeToNetworkEvents(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handleEvent = () => {
    onChange();
  };

  window.addEventListener("online", handleEvent);
  window.addEventListener("offline", handleEvent);
  document.addEventListener("visibilitychange", handleEvent);

  const conn = getNetworkInformation();
  if (conn && typeof conn.addEventListener === "function") {
    conn.addEventListener("change", handleEvent);
    conn.addEventListener("typechange", handleEvent);
  }

  return () => {
    window.removeEventListener("online", handleEvent);
    window.removeEventListener("offline", handleEvent);
    document.removeEventListener("visibilitychange", handleEvent);
    if (conn && typeof conn.removeEventListener === "function") {
      conn.removeEventListener("change", handleEvent);
      conn.removeEventListener("typechange", handleEvent);
    }
  };
}
