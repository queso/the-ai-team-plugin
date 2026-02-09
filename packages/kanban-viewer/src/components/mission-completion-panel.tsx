"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type {
  Mission,
  FinalReviewStatus,
  PostChecksStatus,
  DocumentationStatus,
  CheckResultStatus,
} from "@/types";

// Phase status type
export type PhaseStatus = "pending" | "active" | "complete" | "failed";

// TabId type - extended to include completion
export type TabId = "live-feed" | "human-input" | "git" | "new-mission" | "completion";

// Component props
export interface MissionCompletionPanelProps {
  mission: Mission;
  finalReview?: FinalReviewStatus;
  postChecks?: PostChecksStatus;
  documentation?: DocumentationStatus;
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

// Determine if mission is in a completion phase
function isCompletionPhase(status: Mission["status"]): boolean {
  return ["final_review", "post_checks", "documentation", "complete"].includes(status);
}

// Determine Final Review phase status
function getFinalReviewPhaseStatus(
  mission: Mission,
  finalReview?: FinalReviewStatus
): PhaseStatus {
  if (!finalReview) {
    return "pending";
  }
  // If mission has moved past final_review or review explicitly completed
  if (finalReview.completed_at || ["post_checks", "documentation", "complete"].includes(mission.status)) {
    return finalReview.passed ? "complete" : "failed";
  }
  if (finalReview.started_at && mission.status === "final_review") {
    return "active";
  }
  return "pending";
}

// Determine Post-Checks phase status
function getPostChecksPhaseStatus(
  mission: Mission,
  postChecks?: PostChecksStatus
): PhaseStatus {
  if (!postChecks) {
    return "pending";
  }
  if (postChecks.completed_at) {
    return postChecks.passed ? "complete" : "failed";
  }
  if (postChecks.started_at && mission.status === "post_checks") {
    return "active";
  }
  return "pending";
}

// Determine Documentation phase status
function getDocumentationPhaseStatus(
  mission: Mission,
  documentation?: DocumentationStatus
): PhaseStatus {
  if (!documentation) {
    return "pending";
  }
  if (documentation.completed) {
    return "complete";
  }
  if (documentation.started_at && mission.status === "documentation") {
    return "active";
  }
  return "pending";
}

// Status color mapping
function getStatusColorClass(status: PhaseStatus): string {
  switch (status) {
    case "complete":
      return "border-green-500 bg-green-500/10";
    case "failed":
      return "border-red-500 bg-red-500/10";
    case "active":
      return "border-yellow-500 bg-yellow-500/10";
    case "pending":
    default:
      return "border-gray-500 bg-gray-500/10";
  }
}

// Get text color class for status
function getStatusTextClass(status: PhaseStatus): string {
  switch (status) {
    case "complete":
      return "text-green-500";
    case "failed":
      return "text-red-500";
    case "active":
      return "text-yellow-500";
    case "pending":
    default:
      return "text-gray-500";
  }
}

// Check icon component
function CheckIcon({ status }: { status: CheckResultStatus }) {
  switch (status) {
    case "passed":
      return <span data-icon="check" className="text-green-500">&#10003;</span>;
    case "failed":
      return <span data-icon="x" className="text-red-500">&#10007;</span>;
    case "running":
      return <span data-icon="running" className="text-yellow-500 animate-pulse">&#8635;</span>;
    case "pending":
    default:
      return <span data-icon="pending" className="text-gray-400">&#8226;</span>;
  }
}

// Get check status color class
function getCheckStatusClass(status: CheckResultStatus): string {
  switch (status) {
    case "passed":
      return "text-green-500";
    case "failed":
      return "text-red-500";
    case "running":
      return "text-yellow-500";
    case "pending":
    default:
      return "text-gray-400";
  }
}

// Pipeline connector arrow component
function PhaseConnector() {
  return (
    <div data-testid="pipeline-connector" className="flex items-center justify-center px-2">
      <span className="text-gray-500 text-lg">&rarr;</span>
    </div>
  );
}

// Warning icon for failure card
function WarningIcon() {
  return <span data-icon="warning" className="text-red-500 text-xl mr-2">&#9888;</span>;
}

// Check circle icon for completion
function CheckCircleIcon() {
  return <span data-icon="check-circle" className="text-green-500 text-2xl mr-2">&#10004;</span>;
}

// Format timestamp to show time portion
function formatTime(isoString?: string): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  const hours = date.getUTCHours().toString().padStart(2, "0");
  const minutes = date.getUTCMinutes().toString().padStart(2, "0");
  const seconds = date.getUTCSeconds().toString().padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

// Final Review Phase Component
function FinalReviewPhase({
  status,
  finalReview,
}: {
  status: PhaseStatus;
  finalReview?: FinalReviewStatus;
}) {
  const statusClass = getStatusColorClass(status);
  const textClass = getStatusTextClass(status);

  return (
    <div
      data-testid="phase-final-review"
      data-status={status}
      className={cn(
        "flex-1 p-3 rounded-lg border-2",
        statusClass,
        status === "complete" && "border-green-500 bg-green-500/10",
        status === "failed" && "border-red-500 bg-red-500/10"
      )}
    >
      <div className="font-semibold mb-2">Final Review</div>
      {finalReview?.agent && (
        <div className="text-sm mb-1">
          <span
            data-testid={`agent-indicator-${finalReview.agent}`}
            className="text-purple-500"
          >
            {finalReview.agent}
          </span>
        </div>
      )}
      {status === "active" && (
        <div className={cn("text-sm", textClass)}>reviewing...</div>
      )}
      {finalReview?.verdict && (
        <div className={cn("text-sm font-semibold", finalReview.passed ? "text-green-500" : "text-red-500")}>
          {finalReview.verdict}
        </div>
      )}
      {finalReview?.rejections !== undefined && finalReview.rejections > 0 && (
        <div className="text-sm">
          Rejections: <span data-testid="rejection-count">{finalReview.rejections}</span>
        </div>
      )}
      {finalReview?.completed_at && (
        <div className="text-xs text-gray-400 mt-1">
          {formatTime(finalReview.completed_at)}
        </div>
      )}
    </div>
  );
}

// Post-Checks Phase Component
function PostChecksPhase({
  status,
  postChecks,
}: {
  status: PhaseStatus;
  postChecks?: PostChecksStatus;
}) {
  const statusClass = getStatusColorClass(status);

  const checks = postChecks?.results ?? {
    lint: { status: "pending" as CheckResultStatus },
    typecheck: { status: "pending" as CheckResultStatus },
    test: { status: "pending" as CheckResultStatus },
    build: { status: "pending" as CheckResultStatus },
  };

  return (
    <div
      data-testid="phase-post-checks"
      data-status={status}
      className={cn(
        "flex-1 p-3 rounded-lg border-2",
        statusClass,
        status === "complete" && "border-green-500 bg-green-500/10",
        status === "failed" && "border-red-500 bg-red-500/10"
      )}
    >
      <div className="font-semibold mb-2">Post-Checks</div>
      <div className="space-y-1">
        {(["lint", "typecheck", "test", "build"] as const).map((checkName) => (
          <div
            key={checkName}
            data-testid={`check-${checkName}`}
            data-status={checks[checkName].status}
            className={cn(
              "flex items-center gap-2 text-sm",
              getCheckStatusClass(checks[checkName].status)
            )}
          >
            <CheckIcon status={checks[checkName].status} />
            <span>{checkName}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Documentation Phase Component
function DocumentationPhase({
  status,
  documentation,
  postChecksFailed,
  showDetails,
}: {
  status: PhaseStatus;
  documentation?: DocumentationStatus;
  postChecksFailed: boolean;
  showDetails: boolean;
}) {
  const statusClass = getStatusColorClass(status);
  const textClass = getStatusTextClass(status);

  return (
    <div
      data-testid="phase-documentation"
      data-status={status}
      className={cn(
        "flex-1 p-3 rounded-lg border-2",
        statusClass,
        status === "complete" && "border-green-500 bg-green-500/10"
      )}
    >
      <div className="font-semibold mb-2">Documentation</div>
      {documentation?.agent && (
        <div className="text-sm mb-1">
          <span
            data-testid={`agent-indicator-${documentation.agent}`}
            className="text-teal-500"
          >
            {documentation.agent}
          </span>
        </div>
      )}
      {postChecksFailed && status === "pending" && (
        <div className="text-sm text-gray-400">blocked</div>
      )}
      {!postChecksFailed && status === "pending" && !documentation && (
        <div className="text-sm text-gray-400">waiting</div>
      )}
      {status === "active" && (
        <div className={cn("text-sm", textClass)}>writing...</div>
      )}
      {documentation?.completed && (
        <>
          <div className="text-sm text-green-500 font-semibold">COMMITTED</div>
          {showDetails && documentation.commit && (
            <div className="text-xs font-mono mt-1">{documentation.commit}</div>
          )}
        </>
      )}
      {showDetails && documentation?.files_modified && documentation.files_modified.length > 0 && (
        <div className="text-xs mt-2 space-y-0.5">
          {documentation.files_modified.map((file) => (
            <div key={file} className="text-gray-400">{file}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// Failure Card Component
function FailureCard({ postChecks }: { postChecks: PostChecksStatus }) {
  const failedChecks = Object.entries(postChecks.results)
    .filter(([, result]) => result.status === "failed")
    .map(([name]) => name);

  return (
    <div
      data-testid="failure-card"
      className="mt-4 p-4 bg-red-500/10 border border-red-500 rounded-lg"
    >
      <div className="flex items-center">
        <WarningIcon />
        <span className="font-semibold text-red-500">
          Check Failed: {failedChecks.join(", ")}
        </span>
      </div>
    </div>
  );
}

// Completion Summary Card Component
function CompletionSummaryCard({ documentation }: { documentation?: DocumentationStatus }) {
  return (
    <div
      data-testid="completion-summary-card"
      className="mt-4 p-4 bg-green-500/10 border border-green-500 rounded-lg"
    >
      <div className="flex items-center mb-2">
        <CheckCircleIcon />
        <span className="font-bold text-green-500 text-lg">MISSION COMPLETE</span>
      </div>
      {documentation?.commit && (
        <div className="text-sm mb-1">
          Commit: <span className="font-mono">{documentation.commit}</span>
        </div>
      )}
      {documentation?.summary && (
        <div className="text-sm text-gray-300 mb-2">{documentation.summary}</div>
      )}
      {documentation?.files_modified && documentation.files_modified.length > 0 && (
        <div className="text-xs mt-2">
          <div className="text-gray-400 mb-1">Files:</div>
          {documentation.files_modified.map((file) => (
            <div key={file} className="text-gray-300 ml-2">{file}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// Main Component
export function MissionCompletionPanel({
  mission,
  finalReview,
  postChecks,
  documentation,
  activeTab,
  onTabChange,
}: MissionCompletionPanelProps) {
  const showPanel = isCompletionPhase(mission.status) && activeTab === "completion";

  const finalReviewStatus = getFinalReviewPhaseStatus(mission, finalReview);
  const postChecksStatus = getPostChecksPhaseStatus(mission, postChecks);
  const documentationStatus = getDocumentationPhaseStatus(mission, documentation);

  const postChecksFailed = postChecks?.completed_at !== undefined && !postChecks.passed;
  const showFailureCard = postChecksFailed;
  const showSummaryCard = mission.status === "complete";

  // Handle tab click/keyboard
  const handleTabKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      onTabChange("completion");
    }
  };

  return (
    <>
      {/* Tab trigger - always visible when in completion phase */}
      {isCompletionPhase(mission.status) && (
        <div
          role="tab"
          aria-label="Completion"
          data-state={activeTab === "completion" ? "active" : "inactive"}
          tabIndex={0}
          onKeyDown={handleTabKeyDown}
          onClick={() => onTabChange("completion")}
          className={cn(
            "px-3 py-1.5 text-sm font-medium cursor-pointer rounded-t",
            activeTab === "completion"
              ? "bg-[#2a2a2a] text-white"
              : "text-gray-400 hover:text-white"
          )}
        >
          Completion
        </div>
      )}

      {/* Panel content - only visible when tab is active */}
      {showPanel && (
        <div
          data-testid="mission-completion-panel"
          className="p-4 bg-[#1a1a1a]"
        >
          {/* Three-phase pipeline */}
          <div className="flex items-stretch">
            <FinalReviewPhase
              status={finalReviewStatus}
              finalReview={finalReview}
            />
            <PhaseConnector />
            <PostChecksPhase
              status={postChecksStatus}
              postChecks={postChecks}
            />
            <PhaseConnector />
            <DocumentationPhase
              status={documentationStatus}
              documentation={documentation}
              postChecksFailed={postChecksFailed}
              showDetails={!showSummaryCard}
            />
          </div>

          {/* Failure card */}
          {showFailureCard && postChecks && (
            <FailureCard postChecks={postChecks} />
          )}

          {/* Completion summary card */}
          {showSummaryCard && (
            <CompletionSummaryCard documentation={documentation} />
          )}
        </div>
      )}
    </>
  );
}
