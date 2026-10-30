import { useEffect } from "react";
import { DOC_TITLE_SUFFIX } from "./pages";

// Sets the document title to "<TAB_NAME> - DSML Portal".
export function useDocumentTitle(tabName: string) {
  useEffect(() => {
    document.title = `${tabName} - ${DOC_TITLE_SUFFIX}`;
  }, [tabName]);
}
