
import React, { useEffect } from "react";
import { useRouter } from "next/router";

export default function CoursesRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace("/learn");
  }, [router]);

  return null;
}
