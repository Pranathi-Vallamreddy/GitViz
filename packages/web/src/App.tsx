import { MarkGithubIcon } from "@primer/octicons-react";
import { Box, Heading, Label, PageLayout, Text } from "@primer/react";
import { GITVIZ_VERSION } from "@gitviz/shared";

/**
 * Application shell. Phase 0 renders a placeholder layout that establishes the
 * three-pane structure the real UI will fill in: commit graph, repository
 * explorer, and object inspector.
 */
export function App() {
  return (
    <PageLayout>
      <PageLayout.Header>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <MarkGithubIcon size={24} />
          <Heading as="h1" sx={{ fontSize: 3 }}>
            GitViz
          </Heading>
          <Label variant="accent">v{GITVIZ_VERSION}</Label>
        </Box>
      </PageLayout.Header>
      <PageLayout.Content>
        <Text>
          Scaffold ready. The commit-graph visualization, repository explorer, and object
          inspector will be built on top of this shell.
        </Text>
      </PageLayout.Content>
    </PageLayout>
  );
}
