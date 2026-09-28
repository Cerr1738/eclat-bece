import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BookOpen, Award, Target, Brain, Search, PlusCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";

import { QuizResult } from "@/types/parent";

interface ParentActivityFeedProps {
    activities: QuizResult[];
    isLoading: boolean;
}

export function ParentActivityFeed({ activities, isLoading }: ParentActivityFeedProps) {
    if (isLoading) {
        return (
            <Card className="border border-[#233148] bg-[#0c1628] text-slate-100 rounded-2xl">
                <CardHeader className="border-b border-[#202b43]">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-[#71c9ed]">
                        <Target className="h-5 w-5 text-[#3bc2f3]" />
                        Recent Activity
                    </CardTitle>
                    <CardDescription className="text-slate-400 text-xs">Loading recent activities...</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="animate-pulse flex items-start gap-4 p-3 border border-[#202b43] bg-[#080f22] rounded-xl">
                            <div className="w-10 h-10 bg-[#162238] rounded-full"></div>
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-[#162238] rounded w-3/4"></div>
                                <div className="h-3 bg-[#162238] rounded w-1/2"></div>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border border-[#233148] bg-[#0c1628] text-slate-100 shadow-sm h-full max-h-[600px] flex flex-col rounded-2xl">
            <CardHeader className="pb-3 border-b border-[#202b43]">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-[#71c9ed]">
                    <Target className="h-5 w-5 text-[#3bc2f3]" />
                    Recent Activity Timeline
                </CardTitle>
                <CardDescription className="text-slate-400 text-xs">Latest learning milestones across all your children</CardDescription>
            </CardHeader>
            <CardContent className="overflow-y-auto pt-4 flex-1">
                {activities.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 flex flex-col items-center justify-center h-full">
                        <div className="bg-[#0c2438] w-14 h-14 rounded-full flex items-center justify-center mb-3">
                            <Brain className="h-7 w-7 text-[#58c4e8]" />
                        </div>
                        <p className="font-semibold text-white text-sm">No recent activity</p>
                        <p className="text-xs text-slate-400 mt-1">Quizzes completed by your children will appear here.</p>
                    </div>
                ) : (
                    <div className="space-y-5 relative before:absolute before:inset-y-0 before:left-4 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-[#3bc2f3]/40 before:via-[#202b43] before:to-transparent">
                        {activities.map((activity) => (
                            <div key={activity.id} className="relative flex items-start gap-4 group">
                                {/* Timeline dot */}
                                <div className="flex items-center justify-center w-8 h-8 rounded-full border border-[#233148] bg-[#0c2438] text-[#58c4e8] shadow-sm shrink-0 z-10 transition-transform duration-300 group-hover:scale-110 mt-1">
                                    {activity.score >= 80 ? <Award className="h-4 w-4 text-[#48d7b7]" /> : <BookOpen className="h-4 w-4 text-[#58c4e8]" />}
                                </div>

                                {/* Timeline card */}
                                <div className="flex-1 p-3.5 sm:p-4 rounded-xl border border-[#202b43] bg-[#080f22] backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-300 min-w-0 hover:border-[#3bc2f3]/40">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-1.5">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="font-bold text-white text-sm truncate">{activity.student_name}</span>
                                            <Badge className={`shrink-0 text-[10px] font-bold border ${activity.score >= 80 ? 'bg-[#102f2b] text-[#48d7b7] border-[#1d4f47]' : 'bg-[#18263e] text-slate-300 border-[#2a3c5a]'}`}>
                                                {Math.round(activity.score)}%
                                            </Badge>
                                        </div>
                                        <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap">
                                            {formatDistanceToNow(new Date(activity.completed_at), { addSuffix: true })}
                                        </span>
                                    </div>
                                    <div className="text-xs text-slate-300 leading-relaxed">
                                        Completed a <strong className="text-white font-semibold">{activity.subject}</strong> quiz
                                        {" "}(<span className="font-mono text-[#3bc2f3] font-bold">{activity.correct_answers}/{activity.total_questions}</span> correct)
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
