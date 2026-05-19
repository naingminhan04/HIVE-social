"use client";

import { useEffect } from "react";

const BackendActivator = () => {
  useEffect(() => {
    const ping = async () => {
      try {
        await fetch("https://seaapi.mine.bz/v1/api/", {
          method: "GET",
          cache: "no-store",
        });
      } catch {
        // Keep the activator silent; it is only a warm-up call.
      }
    };

    ping();

    const interval = setInterval(ping, 840_000);

    return () => clearInterval(interval);
  }, []);

  return null;
};

export default BackendActivator;
