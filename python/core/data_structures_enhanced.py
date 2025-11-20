"""
Enhanced Data Structures for Virtual Memory Implementor
Includes dirty bits, protection bits, reference bits, and advanced features
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional
from enum import Enum


class PageReplacementAlgorithm(Enum):
    """Page replacement algorithms"""
    LRU = "LRU"
    FIFO = "FIFO"
    LFU = "LFU"
    CLOCK = "CLOCK"
    OPTIMAL = "OPTIMAL"
    AGING = "AGING"


class AccessType(Enum):
    """Memory access types"""
    READ = "READ"
    WRITE = "WRITE"
    EXECUTE = "EXECUTE"


class ProtectionBits(Enum):
    """Page protection bits"""
    READ_ONLY = "R"
    READ_WRITE = "RW"
    READ_EXECUTE = "RX"
    READ_WRITE_EXECUTE = "RWX"


@dataclass
class PTEntry:
    """Enhanced Page Table Entry"""
    frame: int = -1
    valid: bool = False
    time: int = 0
    frequency: int = 0
    dirty: bool = False
    reference: bool = False
    protection: ProtectionBits = ProtectionBits.READ_WRITE
    age: int = 0  # For aging algorithm
    
    def reset_reference(self):
        """Reset reference bit (for CLOCK)"""
        self.reference = False
    
    def set_dirty(self):
        """Mark page as dirty"""
        self.dirty = True
    
    def age_page(self):
        """Age the page (shift right and add reference bit)"""
        self.age = (self.age >> 1) | (0x80 if self.reference else 0)
        self.reference = False


@dataclass
class Process:
    """Enhanced Process Control Block"""
    pid: int
    m: int
    allocount: int
    usecount: int = 0
    reference_string: List[int] = field(default_factory=list)
    access_types: List[AccessType] = field(default_factory=list)
    current_index: int = 0
    completed: bool = False
    working_set: List[int] = field(default_factory=list)
    working_set_window: int = 10
    page_fault_count: int = 0
    
    def update_working_set(self, page: int):
        """Update working set with recent page"""
        if page not in self.working_set:
            self.working_set.append(page)
        if len(self.working_set) > self.working_set_window:
            self.working_set.pop(0)


@dataclass
class TLBEntry:
    """Enhanced TLB Entry with ASID support"""
    pid: int = -1
    pageno: int = -1
    frameno: int = -1
    time: int = 0
    valid: bool = False
    asid: int = 0  # Address Space Identifier
    dirty: bool = False
    protection: ProtectionBits = ProtectionBits.READ_WRITE


@dataclass
class FreeFrameList:
    """Free Frame List"""
    frames: List[int] = field(default_factory=list)
    
    @property
    def size(self) -> int:
        return len(self.frames)
    
    def allocate(self) -> Optional[int]:
        if self.frames:
            return self.frames.pop()
        return None
    
    def deallocate(self, frame: int):
        self.frames.append(frame)


@dataclass
class DiskOperation:
    """Represents a disk I/O operation"""
    operation_type: str  # "READ" or "WRITE"
    process_id: int
    page_number: int
    frame_number: int
    timestamp: int


@dataclass
class SimulationStep:
    """Enhanced simulation step with detailed information"""
    timestamp: int
    process_id: int
    page_number: int
    event: str
    frame_number: int = -1
    message: str = ""
    explanation: str = ""
    physical_memory: List[int] = field(default_factory=list)
    page_tables: Dict[int, Dict[int, Dict]] = field(default_factory=dict)
    tlb_state: List[Dict] = field(default_factory=list)
    free_frames: List[int] = field(default_factory=list)
    page_fault_count: int = 0
    tlb_hit_count: int = 0
    tlb_miss_count: int = 0
    page_hit_count: int = 0
    disk_reads: int = 0
    disk_writes: int = 0
    dirty_bits: Dict[int, Dict[int, bool]] = field(default_factory=dict)
    reference_bits: Dict[int, Dict[int, bool]] = field(default_factory=dict)
    working_sets: Dict[int, List[int]] = field(default_factory=dict)
    clock_hand: int = 0
    victim_frame: int = -1
    replacement_reason: str = ""


@dataclass
class SimulationConfig:
    """Enhanced configuration"""
    num_processes: int = 4
    max_pages_per_process: int = 5
    num_frames: int = 8
    tlb_size: int = 4
    algorithm: PageReplacementAlgorithm = PageReplacementAlgorithm.LRU
    auto_generate_references: bool = True
    reference_strings: Optional[List[List[int]]] = None
    enable_dirty_bits: bool = True
    enable_prefetching: bool = False
    enable_working_set: bool = True
    enable_asid: bool = False
    tlb_flush_on_context_switch: bool = True
    working_set_window: int = 10
    prefetch_distance: int = 1
    memory_access_time: int = 100  # nanoseconds
    tlb_access_time: int = 10  # nanoseconds
    disk_access_time: int = 10000  # nanoseconds


@dataclass
class SimulationResult:
    """Enhanced simulation results"""
    success: bool = False
    error_message: str = ""
    steps: List[SimulationStep] = field(default_factory=list)
    page_fault_counts: Dict[int, int] = field(default_factory=dict)
    tlb_hit_counts: Dict[int, int] = field(default_factory=dict)
    tlb_miss_counts: Dict[int, int] = field(default_factory=dict)
    total_page_faults: int = 0
    total_tlb_hits: int = 0
    total_tlb_misses: int = 0
    total_page_hits: int = 0
    total_references: int = 0
    total_disk_reads: int = 0
    total_disk_writes: int = 0
    execution_time: float = 0.0
    average_memory_access_time: float = 0.0
    memory_utilization: float = 0.0
    working_set_sizes: Dict[int, List[int]] = field(default_factory=dict)
    
    @property
    def page_fault_rate(self) -> float:
        if self.total_references == 0:
            return 0.0
        return (self.total_page_faults / self.total_references) * 100
    
    @property
    def tlb_hit_rate(self) -> float:
        if self.total_references == 0:
            return 0.0
        return (self.total_tlb_hits / self.total_references) * 100
    
    @property
    def tlb_miss_rate(self) -> float:
        if self.total_references == 0:
            return 0.0
        return (self.total_tlb_misses / self.total_references) * 100
    
    @property
    def page_hit_rate(self) -> float:
        if self.total_references == 0:
            return 0.0
        return (self.total_page_hits / self.total_references) * 100
    
    def calculate_amat(self, config: SimulationConfig) -> float:
        """Calculate Average Memory Access Time"""
        tlb_hit_rate = self.tlb_hit_rate / 100
        page_fault_rate = self.page_fault_rate / 100
        
        amat = (
            config.tlb_access_time +
            (1 - tlb_hit_rate) * config.memory_access_time +
            page_fault_rate * config.disk_access_time
        )
        return amat


@dataclass
class PresetWorkload:
    """Preset workload configurations"""
    name: str
    description: str
    num_processes: int
    max_pages: int
    num_frames: int
    tlb_size: int
    algorithm: PageReplacementAlgorithm
    reference_patterns: List[str]  # "sequential", "random", "looping", "thrashing"


# Preset workloads
PRESET_WORKLOADS = {
    "simple_demo": PresetWorkload(
        name="Simple Demo",
        description="Basic demonstration with 2 processes",
        num_processes=2,
        max_pages=3,
        num_frames=4,
        tlb_size=2,
        algorithm=PageReplacementAlgorithm.LRU,
        reference_patterns=["sequential", "sequential"]
    ),
    "thrashing": PresetWorkload(
        name="Thrashing Scenario",
        description="High page fault rate with insufficient frames",
        num_processes=4,
        max_pages=8,
        num_frames=6,
        tlb_size=3,
        algorithm=PageReplacementAlgorithm.FIFO,
        reference_patterns=["random", "random", "random", "random"]
    ),
    "prefetch_demo": PresetWorkload(
        name="Prefetch Optimization",
        description="Sequential access pattern benefiting from prefetch",
        num_processes=2,
        max_pages=10,
        num_frames=8,
        tlb_size=4,
        algorithm=PageReplacementAlgorithm.LRU,
        reference_patterns=["sequential", "sequential"]
    ),
    "looping": PresetWorkload(
        name="Looping Pattern",
        description="Processes with looping access patterns",
        num_processes=3,
        max_pages=6,
        num_frames=8,
        tlb_size=4,
        algorithm=PageReplacementAlgorithm.CLOCK,
        reference_patterns=["looping", "looping", "looping"]
    )
}
