<?php
add_action( 'wp_enqueue_scripts', 'my_theme_enqueue_styles' );
function my_theme_enqueue_styles() {
    wp_enqueue_style( 'listingpr-parent-style', get_template_directory_uri() . '/style.css' );
    wp_enqueue_style( 'listingpro-child-style', get_stylesheet_directory_uri() . '/style.css', array( 'listingpr-parent-style' ), wp_get_theme()->get( 'Version' ) );
}

require_once get_stylesheet_directory() . '/lp-same-category-widget.php';

// Allow H2 and other post-level HTML in taxonomy descriptions
remove_filter('pre_term_description', 'wp_filter_kses');
add_filter('pre_term_description', 'wp_filter_post_kses');

// Expose Rank Math meta via WP REST API for all content types
add_action('init', function () {
    $rank_math_keys = ['rank_math_description', 'rank_math_title', 'rank_math_focus_keyword', 'rank_math_breadcrumb_title'];

    // Taxonomy terms (categories + locations) — not exposed by Rank Math by default
    foreach (['listing-category', 'location'] as $taxonomy) {
        foreach ($rank_math_keys as $key) {
            register_term_meta($taxonomy, $key, [
                'show_in_rest'  => true,
                'single'        => true,
                'type'          => 'string',
                'auth_callback' => function () { return current_user_can('edit_posts'); },
            ]);
        }
    }

    // Posts (listings) — register explicitly for consistent REST access
    foreach ($rank_math_keys as $key) {
        register_post_meta('listing', $key, [
            'show_in_rest'  => true,
            'single'        => true,
            'type'          => 'string',
            'auth_callback' => function () { return current_user_can('edit_posts'); },
        ]);
    }
});

// kotor-rewriter API endpoints
add_action('rest_api_init', function () {
    register_rest_route('kotor-rewriter/v1', '/update', [
        'methods'             => 'POST',
        'callback'            => 'kotor_rewriter_update',
        'permission_callback' => function () {
            return current_user_can('edit_posts');
        },
    ]);
    register_rest_route('kotor-rewriter/v1', '/read', [
        'methods'             => 'GET',
        'callback'            => 'kotor_rewriter_read',
        'permission_callback' => function () {
            return current_user_can('edit_posts');
        },
    ]);
});

// Helper: extract strapline — first sentence ending in period, works for any next-word case
function kotor_extract_strapline($text) {
    if (preg_match('/^(.+?\.)(\s+\S)/', $text, $sm)) {
        return trim($sm[1]);
    }
    return '';
}

function kotor_rewriter_update(WP_REST_Request $request) {
    $title    = sanitize_text_field($request->get_param('title'));
    $desc     = wp_kses_post($request->get_param('description'));
    $meta     = sanitize_text_field($request->get_param('meta'));
    $tagline  = sanitize_text_field($request->get_param('tagline'));
    $rm_title = sanitize_text_field($request->get_param('rank_math_title'));
    $rm_bc    = sanitize_text_field($request->get_param('rank_math_breadcrumb_title'));

    // Try listing first — by title, fallback to slug
    $post = get_posts([
        'post_type'   => 'listing',
        'post_status' => 'publish',
        'title'       => $title,
        'numberposts' => 1,
    ]);
    if (empty($post) && $request->get_param('slug')) {
        $post = get_posts([
            'name'        => sanitize_text_field($request->get_param('slug')),
            'post_type'   => 'listing',
            'post_status' => 'publish',
            'numberposts' => 1,
        ]);
    }

    if (!empty($post)) {
        $post_id = $post[0]->ID;
        if ($desc) {
            wp_update_post(['ID' => $post_id, 'post_content' => $desc]);
        }
        if ($meta)     update_post_meta($post_id, 'rank_math_description', $meta);
        if ($rm_title) update_post_meta($post_id, 'rank_math_title', $rm_title);
        if ($rm_bc)    update_post_meta($post_id, 'rank_math_breadcrumb_title', $rm_bc);
        if ($tagline) {
            $options = get_post_meta($post_id, 'lp_listingpro_options', true);
            if (is_array($options)) {
                $options['tagline_text'] = $tagline;
                update_post_meta($post_id, 'lp_listingpro_options', $options);
            }
        }
        return ['ok' => true, 'post_id' => $post_id, 'type' => 'listing'];
    }

    // Try category term — by name, fallback to slug
    $terms = get_terms([
        'taxonomy'   => 'listing-category',
        'name'       => $title,
        'hide_empty' => false,
        'number'     => 1,
    ]);
    if ((empty($terms) || is_wp_error($terms)) && $request->get_param('slug')) {
        $term_by_slug = get_term_by('slug', sanitize_text_field($request->get_param('slug')), 'listing-category');
        if ($term_by_slug) $terms = [$term_by_slug];
    }

    if (!empty($terms) && !is_wp_error($terms)) {
        $term     = $terms[0];
        $old_desc = $term->description ?: '';

        $h2 = '';
        if (preg_match('/<h2[^>]*>.*?<\/h2>/i', $old_desc, $m)) {
            $h2 = $m[0];
        }
        if (!$h2 && $term->name) {
            $h2 = '<h2>' . esc_html($term->name) . '</h2>';
        }

        if ($tagline || $desc) {
            $text_no_h2    = trim(preg_replace('/<h2[^>]*>.*?<\/h2>/i', '', $old_desc, 1));
            $text_spaced   = preg_replace('/<\/p>/i', ' ', $text_no_h2);
            $full_text     = trim(wp_strip_all_tags($text_spaced));
            $full_text     = preg_replace('/\s+/', ' ', $full_text);
            $old_strapline = kotor_extract_strapline($full_text);
            $old_body      = $old_strapline ? trim(substr($full_text, strlen($old_strapline))) : $full_text;
            $new_strapline = $tagline ?: $old_strapline;
            $new_body      = $desc ?: $old_body;
            $combined      = $new_strapline ? $new_strapline . ' ' . $new_body : $new_body;
            $new_full      = $h2 . "\n" . $combined;
            wp_update_term($term->term_id, 'listing-category', ['description' => $new_full]);
        }

        if ($meta)     update_term_meta($term->term_id, 'rank_math_description', $meta);
        if ($rm_title) update_term_meta($term->term_id, 'rank_math_title', $rm_title);
        if ($rm_bc)    update_term_meta($term->term_id, 'rank_math_breadcrumb_title', $rm_bc);

        return ['ok' => true, 'term_id' => $term->term_id, 'type' => 'category'];
    }

    // Try location term
    $loc_terms = get_terms([
        'taxonomy'   => 'location',
        'name'       => $title,
        'hide_empty' => false,
        'number'     => 1,
    ]);
    if ((!$loc_terms || is_wp_error($loc_terms)) && $request->get_param('slug')) {
        $loc_by_slug = get_term_by('slug', sanitize_text_field($request->get_param('slug')), 'location');
        if ($loc_by_slug) $loc_terms = [$loc_by_slug];
    }

    if (!empty($loc_terms) && !is_wp_error($loc_terms)) {
        $loc      = $loc_terms[0];
        $old_desc = $loc->description ?: '';

        if ($desc || $tagline) {
            $text_spaced   = preg_replace('/<\/p>/i', ' ', $old_desc);
            $full_text     = trim(wp_strip_all_tags($text_spaced));
            $full_text     = preg_replace('/\s+/', ' ', $full_text);
            $old_strapline = kotor_extract_strapline($full_text);
            $old_body      = $old_strapline ? trim(substr($full_text, strlen($old_strapline))) : $full_text;
            $new_strapline = $tagline ?: $old_strapline;
            $new_body      = $desc ?: $old_body;
            $combined      = $new_strapline ? $new_strapline . ' ' . $new_body : $new_body;
            wp_update_term($loc->term_id, 'location', ['description' => $combined]);
        }

        if ($meta)     update_term_meta($loc->term_id, 'rank_math_description', $meta);
        if ($rm_title) update_term_meta($loc->term_id, 'rank_math_title', $rm_title);
        if ($rm_bc)    update_term_meta($loc->term_id, 'rank_math_breadcrumb_title', $rm_bc);

        return ['ok' => true, 'term_id' => $loc->term_id, 'type' => 'location'];
    }

    return new WP_Error('not_found', 'Listing, category or location not found', ['status' => 404]);
}

function kotor_rewriter_read(WP_REST_Request $request) {
    $title = sanitize_text_field($request->get_param('title'));
    $slug  = sanitize_text_field($request->get_param('slug'));

    if (!$title && !$slug) {
        return new WP_Error('missing_param', 'Title or slug required', ['status' => 400]);
    }

    // Try listing first
    $post = null;
    if ($slug) {
        $posts = get_posts(['name' => $slug, 'post_type' => ['listing'], 'post_status' => 'publish', 'numberposts' => 1]);
        if ($posts) $post = $posts[0];
    }
    if (!$post && $title) {
        $posts = get_posts(['title' => $title, 'post_type' => ['listing'], 'post_status' => 'publish', 'numberposts' => 1]);
        if ($posts) $post = $posts[0];
    }

    if ($post) {
        $meta_desc = get_post_meta($post->ID, 'rank_math_description', true);
        $tagline   = '';
        $lp        = get_post_meta($post->ID, 'lp_listingpro_options', true);
        if (is_array($lp) && isset($lp['tagline_text'])) {
            $tagline = $lp['tagline_text'];
        }
        if (!$tagline && $post->post_content) {
            $body_text = trim(wp_strip_all_tags($post->post_content));
            $tagline   = kotor_extract_strapline($body_text);
        }
        return new WP_REST_Response([
            'ok'                         => true,
            'found'                      => true,
            'id'                         => $post->ID,
            'title'                      => $post->post_title,
            'slug'                       => $post->post_name,
            'type'                       => 'listing',
            'description'                => wp_strip_all_tags($post->post_content ?: ''),
            'raw_html'                   => $post->post_content ?: '',
            'meta_description'           => $meta_desc ?: '',
            'rank_math_title'            => get_post_meta($post->ID, 'rank_math_title', true) ?: '',
            'rank_math_breadcrumb_title' => get_post_meta($post->ID, 'rank_math_breadcrumb_title', true) ?: '',
            'tagline'                    => $tagline ?: '',
        ], 200);
    }

    // Try category term
    $term = null;
    if ($slug) {
        $term = get_term_by('slug', $slug, 'listing-category');
    }
    if (!$term && $title) {
        $term = get_term_by('name', $title, 'listing-category');
    }

    if ($term && !is_wp_error($term)) {
        $raw_desc  = $term->description ?: '';
        $meta_desc = get_term_meta($term->term_id, 'rank_math_description', true);

        $h2 = '';
        if (preg_match('/<h2[^>]*>(.*?)<\/h2>/i', $raw_desc, $m)) {
            $h2 = wp_strip_all_tags($m[1]);
        }

        $text_no_h2  = trim(preg_replace('/<h2[^>]*>.*?<\/h2>/i', '', $raw_desc, 1));
        $text_spaced = preg_replace('/<\/p>/i', ' ', $text_no_h2);
        $full_text   = trim(wp_strip_all_tags($text_spaced));
        $full_text   = preg_replace('/\s+/', ' ', $full_text);
        $strapline   = kotor_extract_strapline($full_text);
        $description = $strapline ? trim(substr($full_text, strlen($strapline))) : $full_text;

        return new WP_REST_Response([
            'ok'                         => true,
            'found'                      => true,
            'id'                         => $term->term_id,
            'title'                      => $term->name,
            'slug'                       => $term->slug,
            'type'                       => 'category',
            'description'                => $description,
            'raw_html'                   => $text_no_h2,
            'h2'                         => $h2,
            'meta_description'           => $meta_desc ?: '',
            'rank_math_title'            => get_term_meta($term->term_id, 'rank_math_title', true) ?: '',
            'rank_math_breadcrumb_title' => get_term_meta($term->term_id, 'rank_math_breadcrumb_title', true) ?: '',
            'tagline'                    => $strapline,
        ], 200);
    }

    // Try location term
    $loc_term = null;
    if ($slug) {
        $loc_term = get_term_by('slug', $slug, 'location');
    }
    if (!$loc_term && $title) {
        $loc_term = get_term_by('name', $title, 'location');
    }

    if ($loc_term && !is_wp_error($loc_term)) {
        $raw_desc  = $loc_term->description ?: '';
        $meta_desc = get_term_meta($loc_term->term_id, 'rank_math_description', true);

        $text_spaced = preg_replace('/<\/p>/i', ' ', $raw_desc);
        $full_text   = trim(wp_strip_all_tags($text_spaced));
        $full_text   = preg_replace('/\s+/', ' ', $full_text);
        $strapline   = kotor_extract_strapline($full_text);
        $description = $strapline ? trim(substr($full_text, strlen($strapline))) : $full_text;

        return new WP_REST_Response([
            'ok'                         => true,
            'found'                      => true,
            'id'                         => $loc_term->term_id,
            'title'                      => $loc_term->name,
            'slug'                       => $loc_term->slug,
            'type'                       => 'location',
            'description'                => $description,
            'raw_html'                   => $raw_desc,
            'meta_description'           => $meta_desc ?: '',
            'rank_math_title'            => get_term_meta($loc_term->term_id, 'rank_math_title', true) ?: '',
            'rank_math_breadcrumb_title' => get_term_meta($loc_term->term_id, 'rank_math_breadcrumb_title', true) ?: '',
            'tagline'                    => $strapline,
        ], 200);
    }

    return new WP_REST_Response(['ok' => true, 'found' => false], 200);
}
