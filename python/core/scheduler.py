"""
Scheduler
Implements round-robin scheduling for processes
"""

from collections import deque
from typing import List, Optional
from .data_structures import Process


class Scheduler:
    """Round-robin scheduler for virtual memory simulation"""
    
    def __init__(self, processes: List[Process]):
        """
        Initialize scheduler with processes
        
        Args:
            processes: List of Process objects
        """
        self.processes = processes
        self.ready_queue = deque(range(len(processes)))  # Queue of process IDs
        self.current_process: Optional[int] = None
        self.completed_count = 0
        self.total_processes = len(processes)
    
    def get_next_process(self) -> Optional[int]:
        """
        Get the next process to execute
        
        Returns:
            Process ID or None if all processes are complete
        """
        if not self.ready_queue:
            return None
        
        self.current_process = self.ready_queue.popleft()
        return self.current_process
    
    def return_to_ready_queue(self, process_id: int):
        """
        Return a process to the ready queue (after page fault)
        
        Args:
            process_id: Process ID to return to queue
        """
        if not self.processes[process_id].completed:
            self.ready_queue.append(process_id)
    
    def mark_process_complete(self, process_id: int):
        """
        Mark a process as completed
        
        Args:
            process_id: Process ID that completed
        """
        self.processes[process_id].completed = True
        self.completed_count += 1
    
    def is_simulation_complete(self) -> bool:
        """Check if all processes have completed"""
        return self.completed_count >= self.total_processes
    
    def get_ready_queue_state(self) -> List[int]:
        """Get current state of ready queue"""
        return list(self.ready_queue)
