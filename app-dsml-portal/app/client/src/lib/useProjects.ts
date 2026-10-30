import { useEffect, useState } from "react";
import { getJson, type Project } from "./api";

// Visible projects of the portal catalog (null while loading).
export function useProjects() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    getJson<Project[]>("/api/projects")
      .then((p) => active && setProjects(p))
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, []);
  return { projects, error };
}
