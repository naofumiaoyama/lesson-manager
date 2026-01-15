"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { saveAvailabilityDefaults } from "@/server/actions/availability";

const dayNames = ["日", "月", "火", "水", "木", "金", "土"];

type DefaultSetting = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isEnabled: number;
};

type Props = {
  initialDefaults: DefaultSetting[];
};

export function AvailabilityDefaultsForm({ initialDefaults }: Props) {
  const [defaults, setDefaults] = useState<DefaultSetting[]>(initialDefaults);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const updateDefault = (
    dayOfWeek: number,
    field: keyof DefaultSetting,
    value: string | number
  ) => {
    setDefaults((prev) =>
      prev.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, [field]: value } : d))
    );
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setMessage(null);

    const result = await saveAvailabilityDefaults(defaults);

    if (result.success) {
      setMessage({ type: "success", text: "設定を保存しました" });
    } else {
      setMessage({
        type: "error",
        text: result.error || "保存に失敗しました",
      });
    }

    setIsLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {defaults.map((setting) => (
          <div
            key={setting.dayOfWeek}
            className={`flex items-center gap-4 p-4 border rounded-lg ${
              setting.isEnabled === 0 ? "bg-muted/50" : ""
            }`}
          >
            <div className="flex items-center gap-2 w-24">
              <Checkbox
                id={`enabled-${setting.dayOfWeek}`}
                checked={setting.isEnabled === 1}
                onCheckedChange={(checked) =>
                  updateDefault(
                    setting.dayOfWeek,
                    "isEnabled",
                    checked ? 1 : 0
                  )
                }
              />
              <Label
                htmlFor={`enabled-${setting.dayOfWeek}`}
                className="font-medium"
              >
                {dayNames[setting.dayOfWeek]}曜日
              </Label>
            </div>

            <div className="flex items-center gap-2 flex-1">
              <Input
                type="time"
                value={setting.startTime}
                onChange={(e) =>
                  updateDefault(setting.dayOfWeek, "startTime", e.target.value)
                }
                disabled={setting.isEnabled === 0}
                className="w-32"
              />
              <span className="text-muted-foreground">〜</span>
              <Input
                type="time"
                value={setting.endTime}
                onChange={(e) =>
                  updateDefault(setting.dayOfWeek, "endTime", e.target.value)
                }
                disabled={setting.isEnabled === 0}
                className="w-32"
              />
            </div>

            <span
              className={`text-sm ${
                setting.isEnabled === 1
                  ? "text-green-600"
                  : "text-muted-foreground"
              }`}
            >
              {setting.isEnabled === 1 ? "予約可能" : "予約不可"}
            </span>
          </div>
        ))}
      </div>

      {message && (
        <div
          className={`p-3 rounded-lg text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      <Button onClick={handleSubmit} disabled={isLoading}>
        {isLoading ? "保存中..." : "設定を保存"}
      </Button>
    </div>
  );
}
