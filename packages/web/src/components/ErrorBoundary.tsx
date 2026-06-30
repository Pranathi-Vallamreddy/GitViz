import { Box, Heading, Text } from "@primer/react";
import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

/** Catches render errors in a route so a crash shows a message, not a blank page. */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override render(): ReactNode {
    if (this.state.error) {
      return (
        <Box sx={{ p: 4 }}>
          <Heading as="h2" sx={{ fontSize: 3, color: "danger.fg" }}>
            Something went wrong
          </Heading>
          <Box
            as="pre"
            sx={{
              mt: 2,
              p: 3,
              bg: "canvas.subtle",
              border: "1px solid",
              borderColor: "border.default",
              borderRadius: 2,
              fontFamily: "mono",
              fontSize: 0,
              whiteSpace: "pre-wrap",
              overflow: "auto",
            }}
          >
            {this.state.error.message}
          </Box>
          <Text sx={{ mt: 2, fontSize: 1, color: "fg.muted" }}>
            Try Refresh, or check that the API server is running.
          </Text>
        </Box>
      );
    }
    return this.props.children;
  }
}
