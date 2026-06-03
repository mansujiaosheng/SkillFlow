mod commands;
mod models;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      commands::project::create_project,
      commands::project::open_project,
      commands::project::save_project,
      commands::project::import_resource,
      commands::project::write_generated_files,
      commands::project::write_lint_report,
      commands::project::load_recent_projects,
      commands::project::save_recent_projects
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
