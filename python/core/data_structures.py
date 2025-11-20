"""
Data structures for the Virtual Memory Implementor
Equivalent to the C++ structures used in the original implementation
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional
from enum import Enum


class PageReplacementAlgorithm(Enum):
    """Page replacement algorithms"""
    LRU = "LRU"  # Least Recently Used
    FIFO = "FIFO"  # First In First Out
    LFU = "LFU"  # Least Frequently Used


@dataclass
class PTEntry:
    """Page Table Entry"""
    frame: int = -1  # Frame number (-1 if not allocated)
    valid: bool = False  # Valid/Invalid bit
    time: int = 0  # Timestamp of last access (for LRU)
    frequency: int = 0  # Access frequency (for LFU)


@dataclass
class Process:
    """Process Control Block"""
    pid: int  # Process ID
    m: int  # Number of pages in the process
    allocount: int  # Number of frames allocated to the process
    usecount: int = 0  # Number of frames currently used by the process
    reference_string: List[int] = field(default_factory=list)  # Page reference sequence
    current_index: int = 0  # Current position in reference string
    completed: bool = False  # Whether process has completed execution


@dataclass
class TLBEntry:
    """Translation Lookaside Buffer Entry"""
    pid: int = -1  # Process ID
    pageno: int = -1  # Page number
    frameno: int = -1  # Frame number
    time: int = 0  # Timestamp (for replacement)
    valid: bool = False  # Valid bit


@dataclass
class FreeFrameList:
    """Free Frame List"""
    frames: List[int] = field(default_factory=list)  # List of free frame numbers
    
    @property
    def size(self) -> int:
        return len(self.frames)
    
    def allocate(self) -> Optional[int]:
        """Allocate a free frame"""
        if self.frames:
            return self.frames.pop()
        return None
    
    def deallocate(self, frame: int):
        """Return a frame to the free list"""
        self.frames.append(frame)


@dataclass
class SimulationStep:
    """Represents a single step in the simulation"""
    timestamp: int
    process_id: int
    page_number: int
    event: str  # "request", "page_fault", "page_hit", "tlb_hit", "invalid_reference", "process_complete"
    frame_number: int = -1
    message: str = ""
    physical_memory: List[int] = field(default_factory=list)  # Frame -> Process mapping
    page_tables: Dict[int, Dict[int, int]] = field(default_factory=dict)  # PID -> {Page -> Frame}
    tlb_state: List[Dict] = field(default_factory=list)  # Current TLB state
    free_frames: List[int] = field(default_factory=list)
    page_fault_count: int = 0
    tlb_hit_count: int = 0
    page_hit_count: int = 0


@dataclass
class SimulationConfig:
    """Configuration for the simulation"""
    num_processes: int = 4  # Number of processes (k)
    max_pages_per_process: int = 5  # Maximum pages per process (m)
    num_frames: int = 8  # Total number of physical frames (f)
    tlb_size: int = 4  # Size of TLB (s)
    algorithm: PageReplacementAlgorithm = PageReplacementAlgorithm.LRU
    auto_generate_references: bool = True
    reference_strings: Optional[List[List[int]]] = None


@dataclass
class SimulationResult:
    """Complete simulation results"""
    success: bool = False
    error_message: str = ""
    steps: List[SimulationStep] = field(default_factory=list)
    page_fault_counts: Dict[int, int] = field(default_factory=dict)  # PID -> fault count
    tlb_hit_counts: Dict[int, int] = field(default_factory=dict)  # PID -> TLB hit count
    total_page_faults: int = 0
    total_tlb_hits: int = 0
    total_page_hits: int = 0
    total_references: int = 0
    execution_time: float = 0.0
    
    @property
    def page_fault_rate(self) -> float:
        """Calculate page fault rate"""
        if self.total_references == 0:
            return 0.0
        return (self.total_page_faults / self.total_references) * 100
    
    @property
    def tlb_hit_rate(self) -> float:
        """Calculate TLB hit rate"""
        if self.total_references == 0:
            return 0.0
        return (self.total_tlb_hits / self.total_references) * 100
    
    @property
    def page_hit_rate(self) -> float:
        """Calculate page hit rate"""
        if self.total_references == 0:
            return 0.0
        return (self.total_page_hits / self.total_references) * 100


# Message types for inter-component communication
class MessageType(Enum):
    """Message types for process communication"""
    PAGE_REQUEST = "page_request"
    PAGE_RESPONSE = "page_response"
    PAGE_FAULT = "page_fault"
    PAGE_FAULT_HANDLED = "page_fault_handled"
    PROCESS_COMPLETE = "process_complete"
    INVALID_REFERENCE = "invalid_reference"
    SCHEDULE_NEXT = "schedule_next"


@dataclass
class Message:
    """Message for inter-component communication"""
    msg_type: MessageType
    process_id: int
    page_number: int = -1
    frame_number: int = -1
    data: Optional[Dict] = None
