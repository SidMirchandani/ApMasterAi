
import { useRouter } from "next/router";
import { useEffect } from "react";

export default function CoursesRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace("/learn");
  }, [router]);

  return null;
}
