import type { ReactNode } from "react";

import { Card, CardBody, CardHeader } from "../ui/primitives";

/** A titled card with a fixed-height chart area for a ResponsiveContainer. */
export function ChartCard({
  title,
  description,
  action,
  children,
  height = 260,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  height?: number;
}) {
  return (
    <Card>
      <CardHeader title={title} description={description} action={action} />
      <CardBody className="pt-4">
        <div style={{ height }} className="w-full">
          {children}
        </div>
      </CardBody>
    </Card>
  );
}
