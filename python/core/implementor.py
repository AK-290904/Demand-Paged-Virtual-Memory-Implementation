"""
Virtual Memory Implementor
Main simulation orchestrator that coordinates MMU, processes, and scheduler
"""

import time
from typing import List, Optional
from .data_structures import (
    SimulationConfig, SimulationResult, SimulationStep,
    PageReplacementAlgorithm, Process
)
from .mmu import MMU
from .scheduler import Scheduler
from .process_manager import ProcessManager


class VirtualMemoryImplementor:
    """Main implementor that orchestrates the virtual memory simulation"""
    
    def __init__(self):
        """Initialize implementor"""
        self.config: Optional[SimulationConfig] = None
        self.mmu: Optional[MMU] = None
        self.scheduler: Optional[Scheduler] = None
        self.processes: List[Process] = []
        self.steps: List[SimulationStep] = []
        self.is_running = False
    
    def configure(self, config: SimulationConfig):
        """
        Configure the implementor
        
        Args:
            config: SimulationConfig object
        """
        self.config = config
        
        # Create processes
        if config.auto_generate_references:
            self.processes = ProcessManager.create_processes(
                config.num_processes,
                config.max_pages_per_process,
                config.num_frames
            )
        else:
            if not config.reference_strings:
                raise ValueError("Reference strings must be provided when auto_generate_references is False")
            self.processes = ProcessManager.create_processes_with_references(
                config.num_processes,
                config.max_pages_per_process,
                config.num_frames,
                config.reference_strings
            )
        
        # Initialize MMU
        self.mmu = MMU(
            config.num_processes,
            config.max_pages_per_process,
            config.num_frames,
            config.tlb_size,
            config.algorithm
        )
        self.mmu.set_processes(self.processes)
        
        # Initialize scheduler
        self.scheduler = Scheduler(self.processes)
        
        self.steps = []
        self.is_running = False
    
    def run_simulation(self) -> SimulationResult:
        """
        Run the complete simulation
        
        Returns:
            SimulationResult object with all steps and statistics
        """
        if not self.config:
            return SimulationResult(
                success=False,
                error_message="Implementor not configured. Call configure() first."
            )
        
        start_time = time.time()
        self.is_running = True
        self.steps = []
        
        try:
            # Print process information
            print("\n=== Virtual Memory Simulation Started ===")
            print(f"Algorithm: {self.config.algorithm.value}")
            print(f"Processes: {self.config.num_processes}")
            print(f"Physical Frames: {self.config.num_frames}")
            print(f"TLB Size: {self.config.tlb_size}")
            print("\nProcess Information:")
            for process in self.processes:
                print(f"  Process {process.pid}: {process.m} pages, "
                      f"{process.allocount} frames allocated, "
                      f"{len(process.reference_string)} references")
            print()
            
            # Main simulation loop
            while not self.scheduler.is_simulation_complete():
                # Get next process from scheduler
                process_id = self.scheduler.get_next_process()
                if process_id is None:
                    break
                
                process = self.processes[process_id]
                
                # Check if process has more pages to reference
                if process.current_index >= len(process.reference_string):
                    # Process completed
                    self._handle_process_completion(process_id)
                    continue
                
                # Get next page reference
                page_number = process.reference_string[process.current_index]
                
                # Handle page request
                frame_number, event_type, message = self.mmu.handle_page_request(
                    process_id, page_number
                )
                
                # Create simulation step
                step = self._create_step(process_id, page_number, frame_number, event_type, message)
                self.steps.append(step)
                
                # Handle different events
                if event_type == "invalid_reference":
                    # Invalid reference - terminate process
                    self._handle_process_completion(process_id)
                    print(f"[INVALID] {message}")
                    
                elif event_type == "page_fault":
                    # Handle page fault
                    print(f"[FAULT] {message}")
                    frame_number = self.mmu.handle_page_fault(process_id, page_number)
                    
                    # Create step for page fault handling
                    fault_step = self._create_step(
                        process_id, page_number, frame_number,
                        "page_fault_handled",
                        f"Page Fault Handled: P{process_id} -> Page {page_number} -> Frame {frame_number}"
                    )
                    self.steps.append(fault_step)
                    
                    # Return process to ready queue
                    self.scheduler.return_to_ready_queue(process_id)
                    
                elif event_type in ["tlb_hit", "page_hit"]:
                    # Successful access - move to next reference
                    process.current_index += 1
                    
                    # Return to ready queue if more references exist
                    if process.current_index < len(process.reference_string):
                        self.scheduler.return_to_ready_queue(process_id)
                    else:
                        # Process completed
                        self._handle_process_completion(process_id)
            
            # Simulation complete
            end_time = time.time()
            execution_time = end_time - start_time
            
            # Calculate statistics
            result = self._generate_result(execution_time)
            
            print("\n=== Simulation Complete ===")
            print(f"Total References: {result.total_references}")
            print(f"Total Page Faults: {result.total_page_faults}")
            print(f"Page Fault Rate: {result.page_fault_rate:.2f}%")
            print(f"TLB Hit Rate: {result.tlb_hit_rate:.2f}%")
            print(f"Execution Time: {execution_time:.4f}s")
            print("\nPage Faults by Process:")
            for pid, count in result.page_fault_counts.items():
                print(f"  Process {pid}: {count} faults")
            
            self.is_running = False
            return result
            
        except Exception as e:
            self.is_running = False
            return SimulationResult(
                success=False,
                error_message=f"Simulation error: {str(e)}"
            )
    
    def _handle_process_completion(self, process_id: int):
        """Handle process completion"""
        self.mmu.free_process_frames(process_id)
        self.scheduler.mark_process_complete(process_id)
        
        # Create completion step
        step = self._create_step(
            process_id, -1, -1, "process_complete",
            f"Process {process_id} completed"
        )
        self.steps.append(step)
        print(f"[COMPLETE] Process {process_id} completed")
    
    def _create_step(self, process_id: int, page_number: int, 
                    frame_number: int, event_type: str, message: str) -> SimulationStep:
        """Create a simulation step with current state"""
        state = self.mmu.get_state_snapshot()
        
        return SimulationStep(
            timestamp=self.mmu.timestamp,
            process_id=process_id,
            page_number=page_number,
            event=event_type,
            frame_number=frame_number,
            message=message,
            physical_memory=state['physical_memory'],
            page_tables=state['page_tables'],
            tlb_state=state['tlb_state'],
            free_frames=state['free_frames'],
            page_fault_count=sum(self.mmu.page_fault_counts.values()),
            tlb_hit_count=self.mmu.tlb_hit_count,
            page_hit_count=self.mmu.page_hit_count
        )
    
    def _generate_result(self, execution_time: float) -> SimulationResult:
        """Generate final simulation result"""
        total_references = sum(len(p.reference_string) for p in self.processes)
        
        return SimulationResult(
            success=True,
            error_message="",
            steps=self.steps,
            page_fault_counts=self.mmu.page_fault_counts.copy(),
            tlb_hit_counts={},  # Can be extended if needed
            total_page_faults=sum(self.mmu.page_fault_counts.values()),
            total_tlb_hits=self.mmu.tlb_hit_count,
            total_page_hits=self.mmu.page_hit_count,
            total_references=total_references,
            execution_time=execution_time
        )
    
    def get_step(self, step_index: int) -> Optional[SimulationStep]:
        """Get a specific simulation step"""
        if 0 <= step_index < len(self.steps):
            return self.steps[step_index]
        return None
    
    def get_all_steps(self) -> List[SimulationStep]:
        """Get all simulation steps"""
        return self.steps
    
    def reset(self):
        """Reset the implementor"""
        self.config = None
        self.mmu = None
        self.scheduler = None
        self.processes = []
        self.steps = []
        self.is_running = False
