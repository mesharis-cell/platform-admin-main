#!/bin/bash

# Check for --stats flag
show_stats=false
filtered_args=()

for arg in "$@"; do
  if [[ $arg == "--stats" ]]; then
    show_stats=true
  else
    filtered_args+=("$arg")
  fi
done

# Initialize arrays for different file types
css_files=()
ts_files=()
js_files=()
supabase_functions_files=()

# Initialize timing variables
total_start_time=$SECONDS

# Function to log timing
log_timing() {
  local operation="$1"
  local duration="$2"
  if [ "$show_stats" = true ]; then
    printf "⏱️  %-25s %6.2fs\n" "$operation:" "$duration"
  fi
}

# Sort files into appropriate arrays
for arg in "${filtered_args[@]}"; do
  # Skip files with .json, no extensions, .lockb or .cjs extensions
  if [[ $arg == *.json || $arg == *.lockb || $arg == *.cjs || $arg != *.* ]]; then
    continue
  elif [[ $arg == supabase/functions* ]]; then
    supabase_functions_files+=("$arg")
  elif [[ $arg == *.css ]]; then
    css_files+=("$arg")
  elif [[ $arg == *.ts || $arg == *.tsx ]]; then
    ts_files+=("$arg")
  elif [[ $arg == *.js || $arg == *.jsx ]]; then
    js_files+=("$arg")
  else
    continue
  fi
done

# Function to handle error output formatting
format_error() {
  local error_msg="$1"
  local file_name="$2"
  echo "<<<<<< CODE_ERROR_START $file_name"
  echo "$error_msg"
  echo "CODE_ERROR_END >>>>>>"
}

# Run Deno lint on supabase/functions files if there are any
if [ ${#supabase_functions_files[@]} -gt 0 ]; then
  deno_start_time=$SECONDS
  for file in "${supabase_functions_files[@]}"; do
    deno_output=$(deno lint --compact "$file" 2>&1)
    exit_status=$?
    if [ $exit_status -ne 0 ]; then
      deno_error=$exit_status
      deno_output="Deno lint errors for $file:
${deno_output}"
      # Accumulate all deno errors
      all_deno_output="${all_deno_output:-}${deno_output}
===========================================
"
    else
      echo "✓ Successfully linted with Deno: $file"
    fi
  done
  deno_duration=$(echo "$SECONDS - $deno_start_time" | bc -l 2>/dev/null || echo $((SECONDS - deno_start_time)))
  log_timing "Deno lint" "$deno_duration"

  # Only output deno errors if any exist
  if [ -n "$all_deno_output" ]; then
    error_file="${supabase_functions_files[0]}"
    format_error "$all_deno_output" "$error_file"
    exit ${deno_error:-1}
  fi

  # If we only processed supabase functions files, exit here
  if [ ${#css_files[@]} -eq 0 ] && [ ${#ts_files[@]} -eq 0 ] && [ ${#js_files[@]} -eq 0 ]; then
    total_duration=$(echo "$SECONDS - $total_start_time" | bc -l 2>/dev/null || echo $((SECONDS - total_start_time)))
    if [ "$show_stats" = true ]; then
      echo ""
      echo "📊 Performance Summary:"
      echo "────────────────────────────────────"
      printf "🏁 Total execution time:    %6.2fs\n" "$total_duration"
    fi
    exit 0
  fi
fi

# Run TypeScript check if there are any TS files
if [ ${#ts_files[@]} -gt 0 ]; then
  ts_start_time=$SECONDS
  # Run tsc with project flag to use tsconfig.json
  output=$(NPM_CONFIG_UPDATE_NOTIFIER=false npx tsc --noEmit --project tsconfig.json 2>&1)
  exit_status=$?
  ts_duration=$(echo "$SECONDS - $ts_start_time" | bc -l 2>/dev/null || echo $((SECONDS - ts_start_time)))
  log_timing "TypeScript check" "$ts_duration"
  
  if [ $exit_status -ne 0 ]; then
    ts_output="Detected TypeScript errors:
${output}"
    ts_error=$exit_status
  else
    echo "✓ Successfully type checked TypeScript files"
  fi
fi

# Run ESLint on all non-CSS files if there are any
if [ ${#js_files[@]} -gt 0 ] || [ ${#ts_files[@]} -gt 0 ]; then
  eslint_start_time=$SECONDS
  all_js_files=("${js_files[@]}" "${ts_files[@]}")
  # Properly handle files with special characters by using -- to separate options from filenames
  eslint_output=$(NPM_CONFIG_UPDATE_NOTIFIER=false npx eslint --format unix -- "${all_js_files[@]}" 2>&1)
  exit_status=$?
  eslint_duration=$(echo "$SECONDS - $eslint_start_time" | bc -l 2>/dev/null || echo $((SECONDS - eslint_start_time)))
  log_timing "ESLint" "$eslint_duration"
  
  if [ $exit_status -ne 0 ]; then
    eslint_error=$exit_status
    eslint_output="ESLint errors:
${eslint_output}"
  fi
fi

if [ ${#css_files[@]} -gt 0 ]; then
  # Run Tailwind check
  if [ -n "${css_files[0]}" ]; then
    tailwind_start_time=$SECONDS
    current_file="${css_files[0]}"
    output=$(NPM_CONFIG_UPDATE_NOTIFIER=false npx @tailwindcss/cli -i "$current_file" 2>&1)
    exit_status=$?
    tailwind_duration=$(echo "$SECONDS - $tailwind_start_time" | bc -l 2>/dev/null || echo $((SECONDS - tailwind_start_time)))
    log_timing "Tailwind CSS" "$tailwind_duration"
    
    if [ $exit_status -ne 0 ]; then
      tailwind_error=$exit_status
      tailwind_output="Tailwind errors:
${output}"
    else
      echo "✓ Successfully processed Tailwind CSS for: $current_file"
    fi
  fi
fi

# Calculate total execution time
total_duration=$(echo "$SECONDS - $total_start_time" | bc -l 2>/dev/null || echo $((SECONDS - total_start_time)))

# Show performance summary if stats are enabled
if [ "$show_stats" = true ]; then
  echo ""
  echo "📊 Performance Summary:"
  echo "────────────────────────────────────"
  
  # Show file counts
  total_files=$((${#supabase_functions_files[@]} + ${#ts_files[@]} + ${#js_files[@]} + ${#css_files[@]}))
  echo "📁 Files processed: $total_files"
  [ ${#supabase_functions_files[@]} -gt 0 ] && echo "   • Supabase functions: ${#supabase_functions_files[@]}"
  [ ${#ts_files[@]} -gt 0 ] && echo "   • TypeScript files: ${#ts_files[@]}"
  [ ${#js_files[@]} -gt 0 ] && echo "   • JavaScript files: ${#js_files[@]}"
  [ ${#css_files[@]} -gt 0 ] && echo "   • CSS files: ${#css_files[@]}"
  
  echo ""
  printf "🏁 Total execution time:    %6.2fs\n" "$total_duration"
fi

# Combine and output all errors if any exist
if [ -n "$ts_output" ] || [ -n "$eslint_output" ] || [ -n "$tailwind_output" ]; then
  error_message=""
  [ -n "$ts_output" ] && error_message+="${ts_output}
===========================================
"
  [ -n "$eslint_output" ] && error_message+="${eslint_output}
===========================================
"
  [ -n "$tailwind_output" ] && error_message+="${tailwind_output}"
  # Use the first available filename for the error message
  error_file="${ts_files[0]:-${js_files[0]:-${css_files[0]}}}"
  format_error "$error_message" "$error_file"
  # Exit with the first error code we encountered
  exit ${ts_error:-${eslint_error:-${stylelint_error:-${tailwind_error:-1}}}}
fi