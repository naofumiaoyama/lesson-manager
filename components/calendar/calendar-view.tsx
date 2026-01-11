"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Video, Clock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  description?: string;
  meetingUrl?: string;
  attendees?: {
    email: string;
    name?: string;
    responseStatus?: string;
  }[];
  isAllDay: boolean;
  color: string;
}

interface CalendarViewProps {
  initialEvents?: CalendarEvent[];
}

export function CalendarView({ initialEvents = [] }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // 月の最初の日と最後の日
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  // カレンダーグリッドの開始日（前月の日も含む）
  const startDay = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  // イベントを取得
  useEffect(() => {
    async function fetchEvents() {
      setLoading(true);
      try {
        const start = new Date(year, month, 1);
        const end = new Date(year, month + 1, 0);

        const res = await fetch(
          `/api/calendar/events?start=${start.toISOString()}&end=${end.toISOString()}`
        );

        if (res.ok) {
          const data = await res.json();
          setEvents(data.events);
        }
      } catch (error) {
        console.error("Failed to fetch events:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, [year, month]);

  // 前月へ
  const goToPrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDate(null);
  };

  // 次月へ
  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDate(null);
  };

  // 今日へ
  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  // 特定の日のイベントを取得
  const getEventsForDate = (date: Date) => {
    return events.filter((event) => {
      const eventDate = new Date(event.start);
      return (
        eventDate.getFullYear() === date.getFullYear() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getDate() === date.getDate()
      );
    });
  };

  // 選択された日のイベント
  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  // カレンダーグリッドを生成
  const calendarDays = [];
  for (let i = 0; i < startDay; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(new Date(year, month, i));
  }

  const weekDays = ["日", "月", "火", "水", "木", "金", "土"];
  const monthNames = [
    "1月", "2月", "3月", "4月", "5月", "6月",
    "7月", "8月", "9月", "10月", "11月", "12月",
  ];

  const today = new Date();
  const isToday = (date: Date) =>
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();

  const isSelected = (date: Date) =>
    selectedDate &&
    date.getFullYear() === selectedDate.getFullYear() &&
    date.getMonth() === selectedDate.getMonth() &&
    date.getDate() === selectedDate.getDate();

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {/* カレンダー */}
      <Card className="md:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-xl font-bold">
            {year}年 {monthNames[month]}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToToday}>
              今日
            </Button>
            <Button variant="outline" size="icon" onClick={goToPrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={goToNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="text-muted-foreground">読み込み中...</div>
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {/* 曜日ヘッダー */}
              {weekDays.map((day, index) => (
                <div
                  key={day}
                  className={`p-2 text-center text-sm font-medium ${
                    index === 0 ? "text-red-500" : index === 6 ? "text-blue-500" : ""
                  }`}
                >
                  {day}
                </div>
              ))}

              {/* 日付グリッド */}
              {calendarDays.map((date, index) => {
                if (!date) {
                  return <div key={`empty-${index}`} className="p-2" />;
                }

                const dayEvents = getEventsForDate(date);
                const dayOfWeek = date.getDay();

                return (
                  <button
                    key={date.toISOString()}
                    onClick={() => setSelectedDate(date)}
                    className={`min-h-[80px] rounded-lg border p-2 text-left transition-colors hover:bg-muted ${
                      isToday(date) ? "border-primary bg-primary/5" : ""
                    } ${isSelected(date) ? "ring-2 ring-primary" : ""}`}
                  >
                    <div
                      className={`text-sm font-medium ${
                        dayOfWeek === 0
                          ? "text-red-500"
                          : dayOfWeek === 6
                            ? "text-blue-500"
                            : ""
                      }`}
                    >
                      {date.getDate()}
                    </div>
                    <div className="mt-1 space-y-1">
                      {dayEvents.slice(0, 2).map((event) => (
                        <div
                          key={event.id}
                          className="truncate rounded px-1 py-0.5 text-xs text-white"
                          style={{ backgroundColor: event.color }}
                        >
                          {event.title.replace("【PrimaMateria】", "")}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-xs text-muted-foreground">
                          +{dayEvents.length - 2} 件
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 選択された日のイベント詳細 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {selectedDate
              ? `${selectedDate.getMonth() + 1}/${selectedDate.getDate()} のスケジュール`
              : "日付を選択してください"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedDate ? (
            selectedDateEvents.length > 0 ? (
              <div className="space-y-4">
                {selectedDateEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">予定はありません</p>
            )
          ) : (
            <p className="text-muted-foreground">
              カレンダーの日付をクリックして予定を確認できます
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EventCard({ event }: { event: CalendarEvent }) {
  const startTime = new Date(event.start);
  const endTime = new Date(event.end);

  const formatTime = (date: Date) =>
    date.toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    });

  const getEventType = (title: string) => {
    if (title.includes("キックオフ") || title.includes("初回")) {
      return { label: "キックオフ", variant: "default" as const };
    }
    if (title.includes("レッスン")) {
      return { label: "レッスン", variant: "default" as const };
    }
    if (title.includes("コミュニティ") || title.includes("勉強会")) {
      return { label: "コミュニティ", variant: "secondary" as const };
    }
    if (title.includes("カウンセリング")) {
      return { label: "カウンセリング", variant: "outline" as const };
    }
    return { label: "イベント", variant: "outline" as const };
  };

  const eventType = getEventType(event.title);

  return (
    <div
      className="rounded-lg border p-4"
      style={{ borderLeftColor: event.color, borderLeftWidth: "4px" }}
    >
      <div className="mb-2 flex items-start justify-between">
        <h4 className="font-medium">
          {event.title.replace("【PrimaMateria】", "")}
        </h4>
        <Badge variant={eventType.variant}>{eventType.label}</Badge>
      </div>

      <div className="space-y-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <span>
            {event.isAllDay
              ? "終日"
              : `${formatTime(startTime)} - ${formatTime(endTime)}`}
          </span>
        </div>

        {event.attendees && event.attendees.length > 0 && (
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>{event.attendees.length}名の参加者</span>
          </div>
        )}

        {event.meetingUrl && (
          <a
            href={event.meetingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-primary hover:underline"
          >
            <Video className="h-4 w-4" />
            <span>ミーティングに参加</span>
          </a>
        )}
      </div>
    </div>
  );
}
