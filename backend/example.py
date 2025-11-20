"""
Example usage of the Virtual Memory Implementor
Demonstrates basic usage and different configurations
"""

from core import (
    VirtualMemoryImplementor, 
    SimulationConfig, 
    PageReplacementAlgorithm
)


def example_1_basic():
    """Example 1: Basic simulation with default parameters"""
    print("\n" + "="*70)
    print("EXAMPLE 1: Basic Simulation")
    print("="*70)
    
    config = SimulationConfig(
        num_processes=4,
        max_pages_per_process=5,
        num_frames=8,
        tlb_size=4,
        algorithm=PageReplacementAlgorithm.LRU
    )
    
    implementor = VirtualMemoryImplementor()
    implementor.configure(config)
    result = implementor.run_simulation()
    
    print(f"\n Results:")
    print(f"   Page Fault Rate: {result.page_fault_rate:.2f}%")
    print(f"   TLB Hit Rate: {result.tlb_hit_rate:.2f}%")
    print(f"   Total Steps: {len(result.steps)}")


def example_2_compare_algorithms():
    """Example 2: Compare different page replacement algorithms"""
    print("\n" + "="*70)
    print("EXAMPLE 2: Comparing Page Replacement Algorithms")
    print("="*70)
    
    algorithms = [
        PageReplacementAlgorithm.LRU,
        PageReplacementAlgorithm.FIFO,
        PageReplacementAlgorithm.LFU
    ]
    
    results = {}
    
    for algo in algorithms:
        config = SimulationConfig(
            num_processes=4,
            max_pages_per_process=5,
            num_frames=8,
            tlb_size=4,
            algorithm=algo
        )
        
        implementor = VirtualMemoryImplementor()
        implementor.configure(config)
        result = implementor.run_simulation()
        
        results[algo.value] = {
            'page_fault_rate': result.page_fault_rate,
            'tlb_hit_rate': result.tlb_hit_rate,
            'total_faults': result.total_page_faults
        }
    
    print("\n Comparison Results:")
    print(f"{'Algorithm':<10} {'Page Faults':<15} {'Fault Rate':<15} {'TLB Hit Rate':<15}")
    print("-" * 60)
    for algo, data in results.items():
        print(f"{algo:<10} {data['total_faults']:<15} "
              f"{data['page_fault_rate']:<14.2f}% {data['tlb_hit_rate']:<14.2f}%")


def example_3_custom_references():
    """Example 3: Using custom reference strings"""
    print("\n" + "="*70)
    print("EXAMPLE 3: Custom Reference Strings")
    print("="*70)
    
    # Define custom reference strings for 2 processes
    custom_refs = [
        [0, 1, 2, 0, 1, 3, 0, 3, 1, 2, 0, 1, 2, 3],  # Process 0
        [1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4, 1, 2]   # Process 1
    ]
    
    config = SimulationConfig(
        num_processes=2,
        max_pages_per_process=5,
        num_frames=6,
        tlb_size=3,
        algorithm=PageReplacementAlgorithm.LRU,
        auto_generate_references=False,
        reference_strings=custom_refs
    )
    
    implementor = VirtualMemoryImplementor()
    implementor.configure(config)
    result = implementor.run_simulation()
    
    print(f"\n Results with Custom References:")
    print(f"   Process 0 References: {len(custom_refs[0])}")
    print(f"   Process 1 References: {len(custom_refs[1])}")
    print(f"   Page Fault Rate: {result.page_fault_rate:.2f}%")
    print(f"   TLB Hit Rate: {result.tlb_hit_rate:.2f}%")


def example_4_high_contention():
    """Example 4: High memory contention scenario"""
    print("\n" + "="*70)
    print("EXAMPLE 4: High Memory Contention")
    print("="*70)
    
    config = SimulationConfig(
        num_processes=6,
        max_pages_per_process=8,
        num_frames=10,  # Limited frames for high contention
        tlb_size=3,
        algorithm=PageReplacementAlgorithm.FIFO
    )
    
    implementor = VirtualMemoryImplementor()
    implementor.configure(config)
    result = implementor.run_simulation()
    
    print(f"\n High Contention Results:")
    print(f"   Total Processes: {config.num_processes}")
    print(f"   Total Frames: {config.num_frames}")
    print(f"   Page Fault Rate: {result.page_fault_rate:.2f}%")
    print(f"   Total Page Faults: {result.total_page_faults}")
    
    print(f"\n   Page Faults by Process:")
    for pid, count in sorted(result.page_fault_counts.items()):
        print(f"      Process {pid}: {count} faults")


def example_5_step_by_step():
    """Example 5: Accessing individual simulation steps"""
    print("\n" + "="*70)
    print("EXAMPLE 5: Step-by-Step Analysis")
    print("="*70)
    
    config = SimulationConfig(
        num_processes=2,
        max_pages_per_process=3,
        num_frames=4,
        tlb_size=2,
        algorithm=PageReplacementAlgorithm.LRU
    )
    
    implementor = VirtualMemoryImplementor()
    implementor.configure(config)
    result = implementor.run_simulation()
    
    print(f"\n First 10 Steps:")
    for i, step in enumerate(result.steps[:10]):
        event_symbol = {
            'tlb_hit': ' TLB',
            'page_hit': ' PAGE',
            'page_fault': ' FAULT',
            'page_fault_handled': '→ HANDLED',
            'process_complete': ' DONE'
        }.get(step.event, '•')
        
        print(f"   [{i+1:2d}] {event_symbol:12s} | {step.message}")
    
    if len(result.steps) > 10:
        print(f"   ... and {len(result.steps) - 10} more steps")


def main():
    """Run all examples"""
    print("\n" + "="*70)
    print("  Virtual Memory Implementor - Python Examples")
    print("="*70)
    
    try:
        example_1_basic()
        example_2_compare_algorithms()
        example_3_custom_references()
        example_4_high_contention()
        example_5_step_by_step()
        
        print("\n" + "="*70)
        print(" All examples completed successfully!")
        print("="*70)
        print("\nTo run the web interface:")
        print("  python api/server.py")
        print("\nThen open: http://localhost:8080")
        print()
        
    except Exception as e:
        print(f"\n Error running examples: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    main()
