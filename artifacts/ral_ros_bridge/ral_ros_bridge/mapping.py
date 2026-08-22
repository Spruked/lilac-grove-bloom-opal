"""Allow-list. Anything not here is dropped."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional

NATS_TO_ROS: List[Dict[str, Any]] = [
    {
        "primitive_type": "twist_base",
        "subject_suffix": "cmd.motion.base",
        "ros": {"kind": "topic", "name": "/cmd_vel", "type": "geometry_msgs/msg/Twist"},
        "coalesce": "latest_wins",
        "max_hz": 20,
        "bodies": ["base"],
    },
    {
        "primitive_type": "nav_to_pose",
        "subject_suffix": "cmd.motion.base",
        "ros": {"kind": "action", "name": "/navigate_to_pose", "type": "nav2_msgs/action/NavigateToPose"},
        "preempt": True,
        "bodies": ["base"],
    },
    {
        "primitive_type": "focus_on",
        "subject_suffix": "cmd.motion.head",
        "ros": {
            "kind": "action",
            "name": "/head_controller/follow_joint_trajectory",
            "type": "control_msgs/action/FollowJointTrajectory",
        },
        "bodies": ["head"],
    },
    {
        "primitive_type": "arm_follow",
        "subject_suffix": "cmd.motion.arm",
        "ros": {
            "kind": "action",
            "name": "/arm_controller/follow_joint_trajectory",
            "type": "control_msgs/action/FollowJointTrajectory",
        },
        "preempt": True,
        "bodies": ["arm"],
    },
    {
        "primitive_type": "gripper_set",
        "subject_suffix": "cmd.motion.gripper",
        "ros": {
            "kind": "action",
            "name": "/gripper_controller/gripper_cmd",
            "type": "control_msgs/action/GripperCommand",
        },
        "bodies": ["gripper"],
    },
    {
        "primitive_type": "idle_in_region",
        "subject_suffix": "cmd.motion.base",
        "ros": {"kind": "composite", "name": "idle_base"},
        "bodies": ["base"],
    },
    {
        "primitive_type": "estop",
        "subject_suffix": "cmd.estop",
        "ros": {"kind": "composite", "name": "estop"},
        "coalesce": "none",
        "bodies": ["base", "arm", "head", "gripper"],
    },
]

ROS_TO_NATS: List[Dict[str, Any]] = [
    {"ros_name": "/joint_states", "subject_suffix": "tel.motion.joints", "max_hz": 50},
    {"ros_name": "tf:base_link,ee_link", "subject_suffix": "tel.motion.pose", "max_hz": 10},
    {"ros_name": "/detections", "subject_suffix": "tel.perception.camera.meta", "max_hz": 10},
    {"ros_name": "/diagnostics", "subject_suffix": "tel.health", "max_hz": 1},
    {"ros_name": "/navigate_to_pose/status", "subject_suffix": "tel.nav", "max_hz": 0},
]

FORBIDDEN_ROS = (
    "/camera/image_raw",
    "/camera/depth/image_raw",
    "/points",
    "/imu/data",
)

FORBIDDEN_NATS_SUB = (
    "cycle.proposal",
    "cmd.tool",
    "cmd.speech",
)


@dataclass(frozen=True)
class CmdMapping:
    primitive_type: str
    subject_suffix: str
    ros: Dict[str, Any]
    coalesce: str
    bodies: List[str]


class MappingTable:
    def __init__(self) -> None:
        self.by_primitive = {
            row["primitive_type"]: CmdMapping(
                primitive_type=row["primitive_type"],
                subject_suffix=row["subject_suffix"],
                ros=row["ros"],
                coalesce=str(row.get("coalesce", "none")),
                bodies=list(row.get("bodies", [])),
            )
            for row in NATS_TO_ROS
        }

    def lookup(self, primitive_type: str) -> Optional[CmdMapping]:
        return self.by_primitive.get(primitive_type)

    def is_forbidden_ros(self, topic: str) -> bool:
        return topic in FORBIDDEN_ROS

    def is_forbidden_nats_subject(self, subject: str) -> bool:
        return any(tok in subject for tok in FORBIDDEN_NATS_SUB)


def lookup_cmd(primitive_type: str) -> Optional[CmdMapping]:
    return MappingTable().lookup(primitive_type)
