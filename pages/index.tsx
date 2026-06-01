import type { GetStaticProps } from "next";
import Home from '../client/src/pages/home';
import { getPlatformPublicStats } from "../server/platform-public-stats";

type IndexPageProps = {
  initialPlatformStats: Awaited<ReturnType<typeof getPlatformPublicStats>> | null;
};

export const getStaticProps: GetStaticProps<IndexPageProps> = async () => {
  try {
    return {
      props: {
        initialPlatformStats: await getPlatformPublicStats(),
      },
      revalidate: 300,
    };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[home] failed to prefetch platform stats", error);
    }
    return {
      props: {
        initialPlatformStats: null,
      },
      revalidate: 60,
    };
  }
};

export default function IndexPage(props: IndexPageProps) {
  return <Home initialPlatformStats={props.initialPlatformStats} />;
}
