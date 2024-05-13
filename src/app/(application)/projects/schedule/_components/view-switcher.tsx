import { Button } from "~/components/ui/button";
import React from "react";
import { ViewMode } from "gantt-task-react";

type ViewSwitcherProps = {
  onViewModeChange: (viewMode: ViewMode) => void;
};
export const ViewSwitcher: React.FC<ViewSwitcherProps> = ({
  onViewModeChange,
}) => {
  return (
    <div className="flex gap-2 p-2">
      <Button onClick={() => onViewModeChange(ViewMode.Hour)}>Hour</Button>
      <Button onClick={() => onViewModeChange(ViewMode.QuarterDay)}>
        Quarter of Day
      </Button>
      <Button onClick={() => onViewModeChange(ViewMode.HalfDay)}>
        Half of Day
      </Button>
      <Button onClick={() => onViewModeChange(ViewMode.Day)}>Day</Button>
      <Button onClick={() => onViewModeChange(ViewMode.Week)}>Week</Button>
      <Button onClick={() => onViewModeChange(ViewMode.Month)}>Month</Button>
      <Button onClick={() => onViewModeChange(ViewMode.Year)}>Year</Button>
    </div>
  );
};
