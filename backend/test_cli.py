"""
Command-line interface for testing the Virtual Memory Implementor
"""

import sys
from core import (
    VirtualMemoryImplementor, SimulationConfig, PageReplacementAlgorithm
)


def print_banner():
    """Print application banner"""
    print("=" * 70)
    print(" " * 15 + "Virtual Memory Implementor - CLI Test")
    print("=" * 70)
    print()


def get_user_input():
    """Get simulation parameters from user"""
    print("Enter simulation parameters:")
    print()
    
    try:
        num_processes = int(input("Number of processes (k) [1-10, default=4]: ") or "4")
        max_pages = int(input("Max pages per process (m) [1-20, default=5]: ") or "5")
        num_frames = int(input("Number of physical frames (f) [1-30, default=8]: ") or "8")
        tlb_size = int(input("TLB size (s) [1-10, default=4]: ") or "4")
        
        print("\nPage Replacement Algorithms:")
        print("1. LRU (Least Recently Used)")
        print("2. FIFO (First In First Out)")
        print("3. LFU (Least Frequently Used)")
        algo_choice = input("Choose algorithm [1-3, default=1]: ") or "1"
        
        algo_map = {
            "1": PageReplacementAlgorithm.LRU,
            "2": PageReplacementAlgorithm.FIFO,
            "3": PageReplacementAlgorithm.LFU
        }
        algorithm = algo_map.get(algo_choice, PageReplacementAlgorithm.LRU)
        
        return SimulationConfig(
            num_processes=num_processes,
            max_pages_per_process=max_pages,
            num_frames=num_frames,
            tlb_size=tlb_size,
            algorithm=algorithm,
            auto_generate_references=True
        )
    except ValueError as e:
        print(f"\nError: Invalid input - {e}")
        sys.exit(1)


def run_simulation(config):
    """Run the simulation with given configuration"""
    print("\n" + "=" * 70)
    print("Starting simulation...")
    print("=" * 70)
    
    implementor = VirtualMemoryImplementor()
    implementor.configure(config)
    result = implementor.run_simulation()
    
    if not result.success:
        print(f"\nSimulation failed: {result.error_message}")
        return False
    
    return True


def display_results(implementor):
    """Display simulation results"""
    if not implementor.steps:
        print("\nNo simulation data available.")
        return
    
    result = implementor._generate_result(0)
    
    print("\n" + "=" * 70)
    print(" " * 25 + "SIMULATION RESULTS")
    print("=" * 70)
    
    print(f"\n Overall Statistics:")
    print(f"  Total References:    {result.total_references}")
    print(f"  Total Page Faults:   {result.total_page_faults}")
    print(f"  Page Fault Rate:     {result.page_fault_rate:.2f}%")
    print(f"  TLB Hits:            {result.total_tlb_hits}")
    print(f"  TLB Hit Rate:        {result.tlb_hit_rate:.2f}%")
    print(f"  Page Hits:           {result.total_page_hits}")
    print(f"  Page Hit Rate:       {result.page_hit_rate:.2f}%")
    
    print(f"\n Page Faults by Process:")
    for pid, count in sorted(result.page_fault_counts.items()):
        process = implementor.processes[pid]
        print(f"  Process {pid}: {count:3d} faults "
              f"({len(process.reference_string)} references, "
              f"{process.m} pages, {process.allocount} frames)")
    
    print(f"\n⏱  Execution Time: {result.execution_time:.4f} seconds")
    print(f" Total Steps: {len(result.steps)}")
    
    print("\n" + "=" * 70)


def show_step_by_step(implementor):
    """Show step-by-step execution"""
    if not implementor.steps:
        return
    
    print("\n" + "=" * 70)
    print("Step-by-Step Execution (showing first 20 steps)")
    print("=" * 70)
    
    for i, step in enumerate(implementor.steps[:20]):
        event_symbol = {
            'tlb_hit': '',
            'page_hit': '',
            'page_fault': '',
            'page_fault_handled': '→',
            'process_complete': '',
            'invalid_reference': ''
        }.get(step.event, '•')
        
        print(f"\n[Step {i+1:3d}] {event_symbol} {step.message}")
        
        if step.event == 'page_fault':
            print(f"         Free frames: {len(step.free_frames)}")
    
    if len(implementor.steps) > 20:
        print(f"\n... and {len(implementor.steps) - 20} more steps")
    
    print("\n" + "=" * 70)


def main():
    """Main entry point"""
    print_banner()
    
    # Get configuration
    config = get_user_input()
    
    # Validate
    if config.num_frames < config.num_processes:
        print("\nError: Number of frames must be >= number of processes")
        sys.exit(1)
    
    # Run simulation
    implementor = VirtualMemoryImplementor()
    implementor.configure(config)
    result = implementor.run_simulation()
    
    if not result.success:
        print(f"\nSimulation failed: {result.error_message}")
        sys.exit(1)
    
    # Display results
    display_results(implementor)
    
    # Ask if user wants to see step-by-step
    print("\n" + "=" * 70)
    show_steps = input("Show step-by-step execution? [y/N]: ").lower()
    if show_steps == 'y':
        show_step_by_step(implementor)
    
    print("\n Simulation completed successfully!")
    print("\nTo run the web interface, execute: python api/server.py")
    print("Then open http://localhost:8080 in your browser")
    print()


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nSimulation interrupted by user.")
        sys.exit(0)
    except Exception as e:
        print(f"\n\nError: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
