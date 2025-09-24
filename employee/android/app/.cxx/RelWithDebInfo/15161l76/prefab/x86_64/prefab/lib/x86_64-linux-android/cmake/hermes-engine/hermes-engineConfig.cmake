if(NOT TARGET hermes-engine::libhermes)
add_library(hermes-engine::libhermes SHARED IMPORTED)
set_target_properties(hermes-engine::libhermes PROPERTIES
    IMPORTED_LOCATION "/Users/honestraj/.gradle/caches/8.14.1/transforms/2fef0e4b6b45d73fb5f627e1a259761f/transformed/hermes-android-0.80.1-release/prefab/modules/libhermes/libs/android.x86_64/libhermes.so"
    INTERFACE_INCLUDE_DIRECTORIES "/Users/honestraj/.gradle/caches/8.14.1/transforms/2fef0e4b6b45d73fb5f627e1a259761f/transformed/hermes-android-0.80.1-release/prefab/modules/libhermes/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

