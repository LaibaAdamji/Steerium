import enum


class GoalStatus(str, enum.Enum):
    active = "active"
    completed = "completed"
    paused = "paused"


class RoadmapItemType(str, enum.Enum):
    milestone = "milestone"
    task = "task"


class RoadmapItemStatus(str, enum.Enum):
    not_started = "not_started"
    in_progress = "in_progress"
    completed = "completed"


class Priority(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"


class OpportunityType(str, enum.Enum):
    masters_program = "masters_program"
    scholarship = "scholarship"
    internship = "internship"
    job = "job"
    certification = "certification"


class ApplicationStatus(str, enum.Enum):
    interested = "interested"
    preparing = "preparing"
    applied = "applied"
    interview = "interview"
    accepted = "accepted"
    rejected = "rejected"


class DocumentType(str, enum.Enum):
    resume = "resume"
    transcript = "transcript"
    other = "other"
