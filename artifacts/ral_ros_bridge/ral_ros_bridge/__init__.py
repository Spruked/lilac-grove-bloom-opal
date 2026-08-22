"""Dumb ROS↔NATS bridge: mapping table + fail-closed stub node."""

from .mapping import MappingTable, lookup_cmd
from .messages import Envelope, RobotTime, validate_envelope
from .node import BridgeNode

__all__ = [
    "MappingTable",
    "lookup_cmd",
    "Envelope",
    "RobotTime",
    "validate_envelope",
    "BridgeNode",
]
