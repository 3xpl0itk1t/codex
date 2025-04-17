import React from "react";
import { it, expect, describe, beforeEach, vi } from "vitest";
import { renderTui } from "./ui-test-helpers";
import { TerminalChatCommandReview } from "../src/components/chat/terminal-chat-command-review";
import { ReviewDecision } from "../src/utils/agent/review";
import { Text } from "ink";

// Define the type for the useInput callback
type UseInputCallback = (
  input: string,
  key: { return?: boolean; escape?: boolean },
) => void;

// Mock the useInput hook from ink
const mockUseInput = vi.fn();
vi.mock("ink", async () => {
  const actual = await vi.importActual("ink");
  return {
    ...(actual as any),
    useInput: mockUseInput,
    Text: ({ children }: { children: React.ReactNode }) => children,
  };
});

interface MockKey {
  upArrow?: boolean;
  downArrow?: boolean;
  leftArrow?: boolean;
  rightArrow?: boolean;
  return?: boolean;
  escape?: boolean;
  ctrl?: boolean;
  shift?: boolean;
  tab?: boolean;
  backspace?: boolean;
  delete?: boolean;
  meta?: boolean;
}

type InputCallback = (input: string, key: MockKey) => void;

describe("TerminalChatCommandReview - Confirm testMode", () => {
  const mockOnReviewCommand = vi.fn();
  const defaultProps = {
    confirmationPrompt: <Text>Mock prompt</Text>,
    onReviewCommand: mockOnReviewCommand,
  };

  beforeEach(() => {
    mockOnReviewCommand.mockClear();
    mockUseInput.mockReset();
  });

  it("shows confirm message when in confirm testMode with YES selection", async () => {
    // Simulate pressing 'y' to select YES
    mockUseInput.mockImplementation((callback: UseInputCallback) => {
      callback("y", { return: false });
    });

    const { lastFrameStripped } = renderTui(
      <TerminalChatCommandReview {...defaultProps} />,
    );

    const frame = lastFrameStripped();
    expect(frame).toContain("Confirm your choice");
    expect(frame).toContain("You selected: Yes");
    expect(frame).toContain('Type "/b" to return to the selection menu');
  });

  it("handles confirmation of YES decision", async () => {
    let storedCallback: UseInputCallback | null = null as UseInputCallback | null;
    mockUseInput.mockImplementation((callback: UseInputCallback) => {
      storedCallback = callback;
    });

    renderTui(<TerminalChatCommandReview {...defaultProps} />);

    // Select YES
    if (storedCallback !== null) storedCallback("y", { return: false });

    // Confirm YES
    if (storedCallback) storedCallback("y", { return: false });

    expect(mockOnReviewCommand).toHaveBeenCalledWith(ReviewDecision.YES);
    expect(mockOnReviewCommand).toHaveBeenCalledWith(ReviewDecision.CONFIRM);
  });

  it("handles back button in confirm testMode", async () => {
    let storedCallback: UseInputCallback | null = null as UseInputCallback | null;
    mockUseInput.mockImplementation((callback: UseInputCallback) => {
      storedCallback = callback;
    });

    const { lastFrameStripped } = renderTui(
      <TerminalChatCommandReview {...defaultProps} />,
    );

    // Select YES
    if (storedCallback) storedCallback("y", { return: false });

    let frame = lastFrameStripped();
    expect(frame).toContain("Confirm your choice");

    // Go back to selection
    if (storedCallback) storedCallback("/b", { return: false });

    frame = lastFrameStripped();
    expect(frame).toContain("Allow command?");
  });

  it("handles NO_CONTINUE with custom message in confirm testMode", async () => {
    let storedCallback: UseInputCallback | null = null as UseInputCallback | null;
    mockUseInput.mockImplementation((callback: UseInputCallback) => {
      storedCallback = callback;
    });

    renderTui(<TerminalChatCommandReview {...defaultProps} />);

    // Select NO_CONTINUE
    if (storedCallback) storedCallback("n", { return: false });
    // Deny with default message
    if (storedCallback) storedCallback("n", { return: false });

    expect(mockOnReviewCommand).toHaveBeenCalledWith(
      ReviewDecision.NO_CONTINUE,
      "Don't do that, but keep trying to fix the problem",
    );
  });

  it("handles NO_EXIT in confirm testMode", async () => {
    let storedCallback: UseInputCallback | null = null as UseInputCallback | null;
    mockUseInput.mockImplementation((callback: UseInputCallback) => {
      storedCallback = callback;
    });

    renderTui(<TerminalChatCommandReview {...defaultProps} />);

    // Press ESC to select NO_EXIT
    if (storedCallback !== null) {
      storedCallback("", { escape: true });
    }
    // Confirm NO_EXIT
    if (storedCallback) storedCallback("n", { return: false });

    expect(mockOnReviewCommand).toHaveBeenCalledWith(ReviewDecision.NO_EXIT);
  });
});

describe("TerminalChatCommandReview", () => {
  beforeEach(() => {
    mockUseInput.mockClear();
  });

  it("should render confirm testMode correctly", () => {
    const onConfirm = vi.fn();
    const onBack = vi.fn();

    const { lastFrame } = renderTui(
      <TerminalChatCommandReview
            testMode="confirm"
            onReviewCommand={onConfirm}
            onBack={onBack} confirmationPrompt={undefined}      />,
    );

    expect(lastFrame()).toContain("YES");
    expect(lastFrame()).toContain("NO_CONTINUE");
    expect(lastFrame()).toContain("NO_EXIT");
  });

  it("should handle YES selection", () => {
    const onConfirm = vi.fn();
    const onBack = vi.fn();

    renderTui(
        <TerminalChatCommandReview
        testMode="confirm"
        onReviewCommand={onConfirm}
        onBack={onBack} confirmationPrompt={undefined}      />,
    );

    // Get the callback that was passed to useInput
    const callback = mockUseInput.mock.calls[0]?.[0];
    if (!callback) {
      throw new Error("mockUseInput was not called or callback is undefined");
    }

    // Simulate down arrow press
    callback("", { downArrow: true });
    // Simulate return key press
    callback("", { return: true });

    expect(onConfirm).toHaveBeenCalled();
  });

  it("should handle back button", () => {
    const onConfirm = vi.fn();
    const onBack = vi.fn();

    renderTui(
        <TerminalChatCommandReview
        testMode="confirm"
        onReviewCommand={onConfirm}
        onBack={onBack} confirmationPrompt={undefined}      />,
    );

    const callback = mockUseInput.mock.calls[0]?.[0];
    if (!callback) {
      throw new Error("mockUseInput was not called or callback is undefined");
    }
    // Simulate escape key press
    callback("", { escape: true });

    expect(onBack).toHaveBeenCalled();
  });

  it("should handle NO_CONTINUE selection", () => {
    const onConfirm = vi.fn();
    const onBack = vi.fn();

    renderTui(
        <TerminalChatCommandReview
        testMode="confirm"
        onReviewCommand={onConfirm}
        onBack={onBack} confirmationPrompt={undefined}      />,
    );

    const callback = mockUseInput.mock.calls[0]?.[0];
    if (!callback) {
      throw new Error("mockUseInput was not called or callback is undefined");
    }
    // Simulate down arrow press twice to reach NO_CONTINUE
    callback("", { downArrow: true });
    callback("", { downArrow: true });
    // Simulate return key press
    callback("", { return: true });

    expect(onConfirm).not.toHaveBeenCalled();
    expect(onBack).not.toHaveBeenCalled();
  });

  it("should handle NO_EXIT selection", () => {
    const onConfirm = vi.fn();
    const onBack = vi.fn();

    renderTui(
        <TerminalChatCommandReview
        testMode="confirm"
        onReviewCommand={onConfirm}
        onBack={onBack} confirmationPrompt={undefined}      />,
    );

    const callback = mockUseInput.mock.calls[0]?.[0];
    if (!callback) {
      throw new Error("mockUseInput was not called or callback is undefined");
    }
    // Simulate down arrow press three times to reach NO_EXIT
    callback("", { downArrow: true });
    callback("", { downArrow: true });
    callback("", { downArrow: true });
    // Simulate return key press
    callback("", { return: true });

    expect(onConfirm).not.toHaveBeenCalled();
    expect(onBack).toHaveBeenCalled();
  });
});
