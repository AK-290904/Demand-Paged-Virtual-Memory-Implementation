"""
Memory Management Unit (MMU)
Handles page table management, TLB, and page fault handling
"""

import sys
from typing import List, Dict, Optional, Tuple
from .data_structures import (
    PTEntry, Process, TLBEntry, FreeFrameList, SimulationStep,
    PageReplacementAlgorithm, MessageType, Message
)


class MMU:
    """Memory Management Unit - handles address translation and page faults"""
    
    def __init__(self, num_processes: int, max_pages: int, num_frames: int, 
                 tlb_size: int, algorithm: PageReplacementAlgorithm, enable_shared_memory: bool = False):
        """
        Initialize MMU
        
        Args:
            num_processes: Number of processes (k)
            max_pages: Maximum pages per process (m)
            num_frames: Total physical frames (f)
            tlb_size: Size of TLB (s)
            algorithm: Page replacement algorithm
            enable_shared_memory: Whether to allow shared memory (advanced mode)
        """
        self.k = num_processes
        self.m = max_pages
        self.f = num_frames
        self.s = tlb_size
        self.algorithm = algorithm
        self.enable_shared_memory = enable_shared_memory
        
        # Page tables: k processes * m pages
        self.page_table: List[List[PTEntry]] = [
            [PTEntry() for _ in range(max_pages)] for _ in range(num_processes)
        ]
        
        # TLB
        self.tlb: List[TLBEntry] = [TLBEntry() for _ in range(tlb_size)]
        
        # Free frame list
        self.free_frames = FreeFrameList(frames=list(range(num_frames - 1, -1, -1)))
        
        # Physical memory (frame -> process_id mapping, -1 if free)
        self.physical_memory: List[int] = [-1] * num_frames
        
        # Statistics
        self.timestamp = 0
        self.page_fault_counts: Dict[int, int] = {i: 0 for i in range(num_processes)}
        self.tlb_hit_count = 0
        self.page_hit_count = 0
        
        # Process control blocks (will be set by master)
        self.processes: List[Process] = []

        # Simple shared-memory configuration: pages with these numbers
        # may be shared across processes (e.g., page 0 as a demo shared page).
        # Only used when enable_shared_memory is True
        self.shared_page_numbers = {0} if enable_shared_memory else set()
        
    def set_processes(self, processes: List[Process]):
        """Set process information"""
        self.processes = processes
        
    def handle_page_request(self, process_id: int, page_number: int, access_type: str = "READ") -> Tuple[int, str, str]:
        """
        Handle a page request from a process
        
        Args:
            process_id: Process ID
            page_number: Requested page number
            access_type: Memory access type ("READ" or "WRITE")
            
        Returns:
            Tuple of (frame_number, event_type, message)
            frame_number: -1 for page fault, -2 for invalid reference
            event_type: "tlb_hit", "page_hit", "page_fault", "invalid_reference"
            message: Human-readable message
        """
        self.timestamp += 1
        
        # Check if page reference is valid
        if page_number < 0 or page_number >= self.processes[process_id].m:
            return -2, "invalid_reference", f"Invalid page reference: P{process_id} -> Page {page_number}"
        
        # Check TLB first (for address translation)
        frame_number_tlb, tlb_hit = self._check_tlb(process_id, page_number)

        # Check page table
        pt_entry = self.page_table[process_id][page_number]
        if pt_entry.valid:
            # Copy-on-Write: write to a shared read-only page
            if access_type.upper() == "WRITE" and pt_entry.read_only:
                return -1, "protection_fault", (
                    f"Protection Fault (CoW): P{process_id} WRITE to read-only "
                    f"Page {page_number} (Frame {pt_entry.frame})"
                )

            # Page hit (may or may not have been in TLB)
            frame_number = pt_entry.frame
            pt_entry.time = self.timestamp
            pt_entry.frequency += 1

            if tlb_hit:
                self.tlb_hit_count += 1
                self._update_tlb_time(process_id, page_number)
                return frame_number, "tlb_hit", (
                    f"TLB Hit: P{process_id} -> Page {page_number} -> Frame {frame_number}"
                )

            # No TLB entry, but valid in page table -> page hit
            self.page_hit_count += 1
            self._update_tlb(process_id, page_number, frame_number)
            return frame_number, "page_hit", (
                f"Page Hit: P{process_id} -> Page {page_number} -> Frame {frame_number}"
            )

        # Page fault
        self.page_fault_counts[process_id] += 1
        return -1, "page_fault", f"Page Fault: P{process_id} -> Page {page_number}"
    
    def handle_page_fault(self, process_id: int, page_number: int) -> int:
        """
        Handle a page fault by allocating a frame
        
        Args:
            process_id: Process ID
            page_number: Page number that caused the fault
            
        Returns:
            Frame number allocated
        """
        process = self.processes[process_id]

        # Shared memory: if enabled and this page is configured as shared and another
        # process already has it loaded, map to the same physical frame in
        # read-only mode for both processes. This allows the visualization
        # to show shared frames across processes.
        # In basic paging mode (enable_shared_memory=False), this is never allowed.
        if self.enable_shared_memory and page_number in getattr(self, "shared_page_numbers", set()):
            for other_pid, other_process in enumerate(self.processes):
                if other_pid == process_id:
                    continue
                if page_number < other_process.m:
                    other_entry = self.page_table[other_pid][page_number]
                    if other_entry.valid:
                        frame_number = other_entry.frame
                        pt_entry = self.page_table[process_id][page_number]
                        pt_entry.frame = frame_number
                        pt_entry.valid = True
                        pt_entry.time = self.timestamp
                        pt_entry.frequency = 1
                        pt_entry.read_only = True
                        pt_entry.shared = True

                        # Ensure the existing mapping is also marked shared/read-only
                        other_entry.read_only = True
                        other_entry.shared = True

                        # Update TLB
                        self._update_tlb(process_id, page_number, frame_number)

                        return frame_number
        
        # Check if we need to evict a page
        if self.free_frames.size == 0 or process.usecount >= process.allocount:
            # Need to evict a page from this process
            frame_number = self._evict_page(process_id)
        else:
            # Allocate a free frame
            frame_number = self.free_frames.allocate()
            process.usecount += 1
        
        # Update page table
        pt_entry = self.page_table[process_id][page_number]
        pt_entry.frame = frame_number
        pt_entry.valid = True
        pt_entry.time = self.timestamp
        pt_entry.frequency = 1
        # Newly faulted pages are private by default
        pt_entry.read_only = False
        pt_entry.shared = False
        
        # Update physical memory
        self.physical_memory[frame_number] = process_id
        
        # Update TLB
        self._update_tlb(process_id, page_number, frame_number)
        
        return frame_number

    def handle_protection_fault(self, process_id: int, page_number: int) -> int:
        """Handle a protection fault for Copy-on-Write.

        When a process attempts to WRITE to a shared read-only page, allocate a
        new frame, simulate copying the data, and update the page table to make
        this process's mapping private and writable.
        """
        process = self.processes[process_id]

        # Allocate a new frame (or evict one) similar to a normal page fault
        if self.free_frames.size == 0 or process.usecount >= process.allocount:
            frame_number = self._evict_page(process_id)
        else:
            frame_number = self.free_frames.allocate()
            process.usecount += 1

        # Update this process's page table entry to point to the new frame
        pt_entry = self.page_table[process_id][page_number]
        pt_entry.frame = frame_number
        pt_entry.valid = True
        pt_entry.time = self.timestamp
        pt_entry.frequency += 1
        pt_entry.read_only = False
        pt_entry.shared = False

        # Update physical memory mapping
        self.physical_memory[frame_number] = process_id

        # Update TLB for this mapping
        self._update_tlb(process_id, page_number, frame_number)

        return frame_number
    
    def _check_tlb(self, process_id: int, page_number: int) -> Tuple[int, bool]:
        """
        Check if page is in TLB
        
        Returns:
            Tuple of (frame_number, hit)
        """
        for entry in self.tlb:
            if entry.valid and entry.pid == process_id and entry.pageno == page_number:
                return entry.frameno, True
        return -1, False
    
    def _update_tlb_time(self, process_id: int, page_number: int):
        """Update timestamp for TLB entry"""
        for entry in self.tlb:
            if entry.valid and entry.pid == process_id and entry.pageno == page_number:
                entry.time = self.timestamp
                break
    
    def _update_tlb(self, process_id: int, page_number: int, frame_number: int):
        """
        Update TLB with new entry
        Uses LRU replacement policy for TLB
        """
        # Check if entry already exists
        for entry in self.tlb:
            if entry.valid and entry.pid == process_id and entry.pageno == page_number:
                entry.frameno = frame_number
                entry.time = self.timestamp
                return
        
        # Find empty slot
        for entry in self.tlb:
            if not entry.valid:
                entry.valid = True
                entry.pid = process_id
                entry.pageno = page_number
                entry.frameno = frame_number
                entry.time = self.timestamp
                return
        
        # Replace LRU entry
        min_time = min(entry.time for entry in self.tlb)
        for entry in self.tlb:
            if entry.time == min_time:
                entry.pid = process_id
                entry.pageno = page_number
                entry.frameno = frame_number
                entry.time = self.timestamp
                break
    
    def _evict_page(self, process_id: int) -> int:
        """
        Evict a page from the process using the configured algorithm
        
        Returns:
            Frame number of evicted page
        """
        if self.algorithm == PageReplacementAlgorithm.LRU:
            return self._evict_lru(process_id)
        elif self.algorithm == PageReplacementAlgorithm.MRU:
            return self._evict_mru(process_id)
        elif self.algorithm == PageReplacementAlgorithm.FIFO:
            return self._evict_fifo(process_id)
        elif self.algorithm == PageReplacementAlgorithm.LFU:
            return self._evict_lfu(process_id)
        else:
            return self._evict_lru(process_id)
    
    def _evict_lru(self, process_id: int) -> int:
        """Evict least recently used page"""
        min_time = sys.maxsize
        victim_page = -1
        
        for page_num in range(self.processes[process_id].m):
            pt_entry = self.page_table[process_id][page_num]
            if pt_entry.valid and pt_entry.time < min_time:
                min_time = pt_entry.time
                victim_page = page_num
        
        # Invalidate the page
        pt_entry = self.page_table[process_id][victim_page]
        frame_number = pt_entry.frame
        pt_entry.valid = False
        
        # Invalidate TLB entries for this page
        for tlb_entry in self.tlb:
            if tlb_entry.valid and tlb_entry.pid == process_id and tlb_entry.pageno == victim_page:
                tlb_entry.valid = False
        
        return frame_number
    
    def _evict_mru(self, process_id: int) -> int:
        """Evict most recently used page"""
        max_time = -1
        victim_page = -1
        
        for page_num in range(self.processes[process_id].m):
            pt_entry = self.page_table[process_id][page_num]
            if pt_entry.valid and pt_entry.time > max_time:
                max_time = pt_entry.time
                victim_page = page_num
        
        # Invalidate the page
        pt_entry = self.page_table[process_id][victim_page]
        frame_number = pt_entry.frame
        pt_entry.valid = False
        
        # Invalidate TLB entries for this page
        for tlb_entry in self.tlb:
            if tlb_entry.valid and tlb_entry.pid == process_id and tlb_entry.pageno == victim_page:
                tlb_entry.valid = False
        
        return frame_number
    
    def _evict_fifo(self, process_id: int) -> int:
        """Evict first-in page (oldest allocation)"""
        # Find the page with the smallest frame number (approximation of FIFO)
        min_frame = sys.maxsize
        victim_page = -1
        
        for page_num in range(self.processes[process_id].m):
            pt_entry = self.page_table[process_id][page_num]
            if pt_entry.valid and pt_entry.frame < min_frame:
                min_frame = pt_entry.frame
                victim_page = page_num
        
        # Invalidate the page
        pt_entry = self.page_table[process_id][victim_page]
        frame_number = pt_entry.frame
        pt_entry.valid = False
        
        # Invalidate TLB entries
        for tlb_entry in self.tlb:
            if tlb_entry.valid and tlb_entry.pid == process_id and tlb_entry.pageno == victim_page:
                tlb_entry.valid = False
        
        return frame_number
    
    def _evict_lfu(self, process_id: int) -> int:
        """Evict least frequently used page"""
        min_freq = sys.maxsize
        victim_page = -1
        
        for page_num in range(self.processes[process_id].m):
            pt_entry = self.page_table[process_id][page_num]
            if pt_entry.valid and pt_entry.frequency < min_freq:
                min_freq = pt_entry.frequency
                victim_page = page_num
        
        # Invalidate the page
        pt_entry = self.page_table[process_id][victim_page]
        frame_number = pt_entry.frame
        pt_entry.valid = False
        
        # Invalidate TLB entries
        for tlb_entry in self.tlb:
            if tlb_entry.valid and tlb_entry.pid == process_id and tlb_entry.pageno == victim_page:
                tlb_entry.valid = False
        
        return frame_number
    
    def free_process_frames(self, process_id: int):
        """Free all frames allocated to a process"""
        for page_num in range(self.processes[process_id].m):
            pt_entry = self.page_table[process_id][page_num]
            if pt_entry.valid:
                frame_number = pt_entry.frame
                self.free_frames.deallocate(frame_number)
                self.physical_memory[frame_number] = -1
                pt_entry.valid = False
        
        # Clear TLB entries for this process
        for tlb_entry in self.tlb:
            if tlb_entry.valid and tlb_entry.pid == process_id:
                tlb_entry.valid = False
        
        self.processes[process_id].usecount = 0
    
    def get_state_snapshot(self) -> Dict:
        """Get current state of MMU for visualization"""
        # Page tables
        page_tables = {}
        for pid in range(self.k):
            page_tables[pid] = {}
            for page_num in range(self.processes[pid].m):
                pt_entry = self.page_table[pid][page_num]
                if pt_entry.valid:
                    page_tables[pid][page_num] = pt_entry.frame
        
        # TLB state
        tlb_state = []
        for entry in self.tlb:
            if entry.valid:
                tlb_state.append({
                    'pid': entry.pid,
                    'page': entry.pageno,
                    'frame': entry.frameno,
                    'time': entry.time
                })
        
        return {
            'physical_memory': self.physical_memory.copy(),
            'page_tables': page_tables,
            'tlb_state': tlb_state,
            'free_frames': self.free_frames.frames.copy(),
            'timestamp': self.timestamp
        }
