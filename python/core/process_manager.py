"""
Process Manager
Handles process creation and reference string generation
"""

import random
from typing import List
from .data_structures import Process


class ProcessManager:
    """Manages process creation and reference string generation"""
    
    @staticmethod
    def generate_reference_string(process_id: int, num_pages: int, 
                                  min_length: int = None, max_length: int = None) -> List[int]:
        """
        Generate a reference string for a process
        Mimics the C++ implementation's pattern of locality
        
        Args:
            process_id: Process ID (for seeding)
            num_pages: Number of pages in the process
            min_length: Minimum length of reference string (default: 2 * num_pages)
            max_length: Maximum length of reference string (default: 10 * num_pages)
            
        Returns:
            List of page numbers representing the reference string
        """
        if min_length is None:
            min_length = 2 * num_pages
        if max_length is None:
            max_length = 10 * num_pages
        
        # Random length between min and max
        ref_length = random.randint(min_length, max_length)
        reference_string = []
        
        # Use a seed for reproducibility within the process
        seed = random.randint(1, 10000)
        generated = 0
        
        while generated < ref_length:
            # Generate a chunk of references
            chunk_size = random.randint(1, ref_length // 3 + 1)
            
            if generated + chunk_size <= ref_length:
                # Randomly decide whether to use the seed (creates locality)
                if random.random() < 0.5:
                    random.seed(seed)
                
                for _ in range(chunk_size):
                    # Generate page number with some randomness
                    page_num = random.randint(0, num_pages - 1)
                    reference_string.append(page_num)
                
                generated += chunk_size
            else:
                # Generate remaining references
                random.seed(seed)
                for _ in range(ref_length - generated):
                    page_num = random.randint(0, num_pages - 1)
                    reference_string.append(page_num)
                generated = ref_length
        
        return reference_string
    
    @staticmethod
    def create_processes(num_processes: int, max_pages: int, num_frames: int) -> List[Process]:
        """
        Create processes with random page counts and frame allocations
        
        Args:
            num_processes: Number of processes to create (k)
            max_pages: Maximum pages per process (m)
            num_frames: Total number of physical frames (f)
            
        Returns:
            List of Process objects
        """
        processes = []
        total_pages = 0
        
        # Create processes with random page counts
        for pid in range(num_processes):
            num_pages = random.randint(1, max_pages)
            process = Process(
                pid=pid,
                m=num_pages,
                allocount=0,  # Will be set later
                usecount=0,
                reference_string=[],
                current_index=0,
                completed=False
            )
            processes.append(process)
            total_pages += num_pages
        
        # Allocate frames to processes
        # Each process gets at least 1 frame
        # Remaining frames distributed proportionally
        total_allocated = 0
        for process in processes:
            # Proportional allocation
            allocation = 1 + int(process.m * (num_frames - num_processes) / total_pages)
            process.allocount = allocation
            total_allocated += allocation
        
        # Distribute remaining frames randomly
        remaining = num_frames - total_allocated
        while remaining > 0:
            random_process = random.choice(processes)
            random_process.allocount += 1
            remaining -= 1
        
        # Generate reference strings
        for process in processes:
            process.reference_string = ProcessManager.generate_reference_string(
                process.pid, process.m
            )
        
        return processes
    
    @staticmethod
    def create_processes_with_references(num_processes: int, max_pages: int, 
                                        num_frames: int, 
                                        reference_strings: List[List[int]]) -> List[Process]:
        """
        Create processes with provided reference strings
        
        Args:
            num_processes: Number of processes
            max_pages: Maximum pages per process
            num_frames: Total physical frames
            reference_strings: Pre-defined reference strings for each process
            
        Returns:
            List of Process objects
        """
        if len(reference_strings) != num_processes:
            raise ValueError("Number of reference strings must match number of processes")
        
        processes = []
        total_pages = 0
        
        # Determine number of pages from reference strings
        for pid in range(num_processes):
            if not reference_strings[pid]:
                raise ValueError(f"Reference string for process {pid} is empty")
            
            # Number of pages is the max page number + 1
            num_pages = max(reference_strings[pid]) + 1
            if num_pages > max_pages:
                raise ValueError(f"Process {pid} references page {num_pages-1}, exceeds max {max_pages-1}")
            
            process = Process(
                pid=pid,
                m=num_pages,
                allocount=0,
                usecount=0,
                reference_string=reference_strings[pid],
                current_index=0,
                completed=False
            )
            processes.append(process)
            total_pages += num_pages
        
        # Allocate frames
        total_allocated = 0
        for process in processes:
            allocation = 1 + int(process.m * (num_frames - num_processes) / total_pages)
            process.allocount = allocation
            total_allocated += allocation
        
        # Distribute remaining frames
        remaining = num_frames - total_allocated
        while remaining > 0:
            random_process = random.choice(processes)
            random_process.allocount += 1
            remaining -= 1
        
        return processes
